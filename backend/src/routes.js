import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  prisma,
  HttpError,
  wrap,
  todayStr,
  isDay,
  addDays,
  periodRange,
  signToken,
  publicUser,
  requireAuth,
  requireAdmin,
  tooManyAttempts,
  recordFailure,
  clearFailures,
  text,
  email,
  password,
  phone,
  randomCode,
} from './util.js';

export const api = Router();

const PURPOSES = ['Reunião de negócios', 'Entrevista', 'Entrega', 'Manutenção / Serviço', 'Visita pessoal', 'Treinamento', 'Outro'];
const STATUSES = ['pending', 'checked_in', 'checked_out', 'cancelled'];

async function getSettings() {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { companyName: map.companyName || 'Minha Empresa', allowRegister: map.allowRegister === 'true' };
}

/** Avisa todos os usuários da equipe. */
async function notifyAll(data) {
  const users = await prisma.user.findMany({ select: { id: true } });
  if (users.length) await prisma.notification.createMany({ data: users.map((u) => ({ ...data, userId: u.id })) });
}

const visitInclude = {
  host: { select: { id: true, name: true, department: true } },
  createdBy: { select: { id: true, name: true } },
};

// ---------- Saúde, configuração pública e autenticação ----------
api.get(
  '/health',
  wrap(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: 'ok' });
  }),
);

api.get(
  '/config',
  wrap(async (_req, res) => {
    res.json({ ...(await getSettings()), purposes: PURPOSES });
  }),
);

api.post(
  '/auth/register',
  wrap(async (req, res) => {
    if (!(await getSettings()).allowRegister) throw new HttpError(403, 'O cadastro está fechado. Peça acesso ao administrador.');
    const name = text(req.body?.name, 'Nome', { max: 80, required: true });
    const mail = email(req.body?.email);
    const pass = password(req.body?.password);
    if (await prisma.user.findUnique({ where: { email: mail } })) throw new HttpError(409, 'Este e-mail já está cadastrado');
    const user = await prisma.user.create({ data: { name, email: mail, passwordHash: await bcrypt.hash(pass, 10) } });
    await prisma.notification.create({
      data: { userId: user.id, type: 'system', kind: 'welcome', title: 'Bem-vindo(a) ao Visitante!', body: 'Registre e acompanhe os visitantes da sua empresa.' },
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  }),
);

api.post(
  '/auth/login',
  wrap(async (req, res) => {
    const mail = email(req.body?.email);
    const pass = typeof req.body?.password === 'string' ? req.body.password : '';
    const key = `${req.ip}|${mail}`;
    if (tooManyAttempts(key)) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.');
    const user = await prisma.user.findUnique({ where: { email: mail } });
    if (!user || !(await bcrypt.compare(pass, user.passwordHash))) {
      recordFailure(key);
      throw new HttpError(401, 'E-mail ou senha incorretos');
    }
    clearFailures(key);
    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

api.use(requireAuth);

// ---------- Conta ----------
api.get('/me', (req, res) => res.json({ user: publicUser(req.user) }));

api.put(
  '/me',
  wrap(async (req, res) => {
    const name = text(req.body?.name, 'Nome', { max: 80, required: true });
    const mail = email(req.body?.email);
    const jobTitle = text(req.body?.jobTitle, 'Cargo', { max: 80 });
    const tel = phone(req.body?.phone);
    if (mail !== req.user.email && (await prisma.user.findUnique({ where: { email: mail } })))
      throw new HttpError(409, 'Este e-mail já está em uso');
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { name, email: mail, jobTitle, phone: tel } });
    res.json({ user: publicUser(user) });
  }),
);

api.put(
  '/me/password',
  wrap(async (req, res) => {
    const current = typeof req.body?.current === 'string' ? req.body.current : '';
    if (!(await bcrypt.compare(current, req.user.passwordHash))) throw new HttpError(400, 'Senha atual incorreta');
    const pass = password(req.body?.password);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await bcrypt.hash(pass, 10) } });
    await prisma.notification.create({
      data: { userId: req.user.id, type: 'system', kind: 'security', title: 'Senha alterada', body: 'Sua senha foi alterada com sucesso.' },
    });
    res.json({ ok: true });
  }),
);

// ---------- Configurações da empresa (admin) ----------
api.put(
  '/settings',
  requireAdmin,
  wrap(async (req, res) => {
    const companyName = text(req.body?.companyName, 'Nome da empresa', { max: 100, required: true });
    const allowRegister = req.body?.allowRegister === true ? 'true' : 'false';
    await prisma.$transaction([
      prisma.setting.upsert({ where: { key: 'companyName' }, update: { value: companyName }, create: { key: 'companyName', value: companyName } }),
      prisma.setting.upsert({ where: { key: 'allowRegister' }, update: { value: allowRegister }, create: { key: 'allowRegister', value: allowRegister } }),
    ]);
    res.json(await getSettings());
  }),
);

// ---------- Equipe (admin) ----------
api.get(
  '/users',
  requireAdmin,
  wrap(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });
    res.json({ users: users.map(publicUser) });
  }),
);

api.post(
  '/users',
  requireAdmin,
  wrap(async (req, res) => {
    const name = text(req.body?.name, 'Nome', { max: 80, required: true });
    const mail = email(req.body?.email);
    const pass = password(req.body?.password);
    const role = req.body?.role === 'admin' ? 'admin' : 'staff';
    const jobTitle = text(req.body?.jobTitle, 'Cargo', { max: 80 });
    if (await prisma.user.findUnique({ where: { email: mail } })) throw new HttpError(409, 'Este e-mail já está cadastrado');
    const user = await prisma.user.create({ data: { name, email: mail, role, jobTitle, passwordHash: await bcrypt.hash(pass, 10) } });
    res.status(201).json({ user: publicUser(user) });
  }),
);

api.put(
  '/users/:id',
  requireAdmin,
  wrap(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new HttpError(404, 'Usuário não encontrado');
    const data = {};
    if (req.body?.role !== undefined) {
      const role = req.body.role === 'admin' ? 'admin' : 'staff';
      if (target.id === req.user.id && role !== 'admin') throw new HttpError(400, 'Você não pode remover seu próprio acesso de administrador');
      data.role = role;
    }
    if (req.body?.password) data.passwordHash = await bcrypt.hash(password(req.body.password), 10);
    if (req.body?.jobTitle !== undefined) data.jobTitle = text(req.body.jobTitle, 'Cargo', { max: 80 });
    const user = await prisma.user.update({ where: { id: target.id }, data });
    res.json({ user: publicUser(user) });
  }),
);

api.delete(
  '/users/:id',
  requireAdmin,
  wrap(async (req, res) => {
    if (req.params.id === req.user.id) throw new HttpError(400, 'Você não pode excluir a própria conta');
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

// ---------- Anfitriões (funcionários visitados) ----------
function hostData(body) {
  return {
    name: text(body?.name, 'Nome', { max: 80, required: true }),
    department: text(body?.department, 'Departamento', { max: 80 }),
    email: email(body?.email, { required: false }),
    phone: phone(body?.phone),
  };
}

api.get(
  '/hosts',
  wrap(async (req, res) => {
    const q = text(req.query.q, 'Busca', { max: 80 });
    const hosts = await prisma.host.findMany({
      where: {
        active: true,
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { department: { contains: q, mode: 'insensitive' } }] } : {}),
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { visits: true } } },
    });
    res.json({ hosts });
  }),
);

api.post(
  '/hosts',
  wrap(async (req, res) => {
    res.status(201).json({ host: await prisma.host.create({ data: hostData(req.body) }) });
  }),
);

api.put(
  '/hosts/:id',
  wrap(async (req, res) => {
    res.json({ host: await prisma.host.update({ where: { id: req.params.id }, data: hostData(req.body) }) });
  }),
);

api.delete(
  '/hosts/:id',
  wrap(async (req, res) => {
    // Mantém o histórico: o nome do anfitrião fica gravado em cada visita.
    await prisma.host.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ ok: true });
  }),
);

// ---------- Visitas ----------
async function visitData(body) {
  const type = body?.type === 'group' ? 'group' : 'individual';
  const groupSize = type === 'group' ? Math.trunc(Number(body?.groupSize)) : 1;
  if (type === 'group' && (!Number.isFinite(groupSize) || groupSize < 2 || groupSize > 200))
    throw new HttpError(400, 'Informe de 2 a 200 pessoas no grupo');
  const purpose = text(body?.purpose, 'Motivo da visita', { max: 80, required: true });
  let hostId = null;
  let hostName = text(body?.hostName, 'Anfitrião', { max: 80 });
  if (body?.hostId) {
    const host = await prisma.host.findUnique({ where: { id: String(body.hostId) } });
    if (!host) throw new HttpError(400, 'Anfitrião não encontrado');
    hostId = host.id;
    hostName = host.department ? `${host.name} (${host.department})` : host.name;
  }
  if (!hostName) throw new HttpError(400, 'Selecione o anfitrião (quem será visitado)');
  return {
    type,
    groupSize,
    visitorName: text(body?.visitorName, type === 'group' ? 'Nome do responsável' : 'Nome completo', { max: 100, required: true }),
    phone: phone(body?.phone),
    email: email(body?.email, { required: false }),
    company: text(body?.company, 'Empresa', { max: 100 }),
    document: text(body?.document, 'Documento', { max: 40 }),
    purpose,
    notes: text(body?.notes, 'Observações', { max: 500 }),
    hostId,
    hostName,
  };
}

async function uniqueCode() {
  for (let i = 0; i < 10; i++) {
    const code = randomCode();
    if (!(await prisma.visit.findUnique({ where: { code } }))) return code;
  }
  throw new HttpError(500, 'Não foi possível gerar o código da visita');
}

function rangeWhere(range) {
  const today = todayStr();
  if (range === 'today') return { visitDate: today };
  if (range === 'week') {
    const { from, to } = periodRange('weekly', today);
    return { visitDate: { gte: from, lte: to } };
  }
  if (range === 'month') {
    const { from, to } = periodRange('monthly', today);
    return { visitDate: { gte: from, lte: to } };
  }
  return {};
}

api.get(
  '/visits',
  wrap(async (req, res) => {
    const q = text(req.query.q, 'Busca', { max: 80 });
    const status = STATUSES.includes(req.query.status) ? req.query.status : undefined;
    const where = {
      ...rangeWhere(req.query.range),
      ...(status ? { status } : {}),
      ...(isDay(req.query.from) && isDay(req.query.to) ? { visitDate: { gte: req.query.from, lte: req.query.to } } : {}),
      ...(q
        ? {
            OR: [
              { visitorName: { contains: q, mode: 'insensitive' } },
              { company: { contains: q, mode: 'insensitive' } },
              { purpose: { contains: q, mode: 'insensitive' } },
              { hostName: { contains: q, mode: 'insensitive' } },
              { code: { equals: q.toUpperCase() } },
            ],
          }
        : {}),
    };
    const take = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const visits = await prisma.visit.findMany({
      where,
      include: visitInclude,
      orderBy: [{ visitDate: 'desc' }, { updatedAt: 'desc' }],
      take,
    });
    res.json({ visits });
  }),
);

api.post(
  '/visits',
  wrap(async (req, res) => {
    const data = await visitData(req.body);
    const today = todayStr();
    const pre = req.body?.mode === 'preregister';
    let visitDate = today;
    if (pre) {
      if (!isDay(req.body?.visitDate)) throw new HttpError(400, 'Informe a data da visita');
      if (req.body.visitDate < today) throw new HttpError(400, 'A data da visita não pode estar no passado');
      visitDate = req.body.visitDate;
    }
    const visit = await prisma.visit.create({
      data: {
        ...data,
        code: await uniqueCode(),
        visitDate,
        preRegistered: pre,
        status: pre ? 'pending' : 'checked_in',
        checkInAt: pre ? null : new Date(),
        createdById: req.user.id,
      },
      include: visitInclude,
    });
    await notifyAll(
      pre
        ? { kind: 'prereg', title: 'Visitante pré-registrado', body: `${visit.visitorName}${visit.company ? ` (${visit.company})` : ''} para ${visitDate.split('-').reverse().join('/')}`, visitId: visit.id }
        : { kind: 'checkin', title: 'Novo check-in', body: `${visit.visitorName}${visit.company ? ` de ${visit.company}` : ''} entrou`, visitId: visit.id },
    );
    res.status(201).json({ visit });
  }),
);

api.get(
  '/visits/:id',
  wrap(async (req, res) => {
    const visit = await prisma.visit.findUnique({ where: { id: req.params.id }, include: visitInclude });
    if (!visit) throw new HttpError(404, 'Visita não encontrada');
    res.json({ visit });
  }),
);

api.put(
  '/visits/:id',
  wrap(async (req, res) => {
    const current = await prisma.visit.findUnique({ where: { id: req.params.id } });
    if (!current) throw new HttpError(404, 'Visita não encontrada');
    const data = await visitData(req.body);
    if (current.status === 'pending' && req.body?.visitDate !== undefined) {
      if (!isDay(req.body.visitDate)) throw new HttpError(400, 'Data inválida');
      if (req.body.visitDate < todayStr()) throw new HttpError(400, 'A data da visita não pode estar no passado');
      data.visitDate = req.body.visitDate;
    }
    const visit = await prisma.visit.update({ where: { id: current.id }, data, include: visitInclude });
    res.json({ visit });
  }),
);

async function doCheckIn(visit, res) {
  if (visit.status === 'checked_in') throw new HttpError(409, `${visit.visitorName} já fez check-in`);
  if (visit.status === 'checked_out') throw new HttpError(409, 'Esta visita já foi encerrada (check-out feito)');
  if (visit.status === 'cancelled') throw new HttpError(409, 'Esta visita foi cancelada');
  const today = todayStr();
  if (visit.visitDate > today)
    throw new HttpError(409, `Visita agendada para ${visit.visitDate.split('-').reverse().join('/')}, não para hoje`);
  const updated = await prisma.visit.update({
    where: { id: visit.id },
    data: { status: 'checked_in', checkInAt: new Date(), visitDate: today },
    include: visitInclude,
  });
  await notifyAll({ kind: 'checkin', title: 'Novo check-in', body: `${updated.visitorName}${updated.company ? ` de ${updated.company}` : ''} entrou`, visitId: updated.id });
  res.json({ visit: updated });
}

api.post(
  '/visits/checkin-code',
  wrap(async (req, res) => {
    const raw = text(req.body?.code, 'Código', { max: 200, required: true }).toUpperCase();
    // O QR pode trazer só o código ou um texto "VISITANTE:<código>".
    const code = raw.replace(/^VISITANTE:/, '').trim();
    const visit = await prisma.visit.findUnique({ where: { code } });
    if (!visit) throw new HttpError(404, 'Código não encontrado. Confira e tente de novo.');
    await doCheckIn(visit, res);
  }),
);

api.post(
  '/visits/:id/checkin',
  wrap(async (req, res) => {
    const visit = await prisma.visit.findUnique({ where: { id: req.params.id } });
    if (!visit) throw new HttpError(404, 'Visita não encontrada');
    await doCheckIn(visit, res);
  }),
);

api.post(
  '/visits/:id/checkout',
  wrap(async (req, res) => {
    const visit = await prisma.visit.findUnique({ where: { id: req.params.id } });
    if (!visit) throw new HttpError(404, 'Visita não encontrada');
    if (visit.status !== 'checked_in') throw new HttpError(409, 'Só é possível fazer check-out de quem está presente');
    const updated = await prisma.visit.update({
      where: { id: visit.id },
      data: { status: 'checked_out', checkOutAt: new Date() },
      include: visitInclude,
    });
    await notifyAll({ kind: 'checkout', title: 'Check-out realizado', body: `${updated.visitorName}${updated.company ? ` de ${updated.company}` : ''} saiu`, visitId: updated.id });
    res.json({ visit: updated });
  }),
);

api.post(
  '/visits/:id/cancel',
  wrap(async (req, res) => {
    const visit = await prisma.visit.findUnique({ where: { id: req.params.id } });
    if (!visit) throw new HttpError(404, 'Visita não encontrada');
    if (visit.status !== 'pending') throw new HttpError(409, 'Só visitas aguardando podem ser canceladas');
    const updated = await prisma.visit.update({ where: { id: visit.id }, data: { status: 'cancelled' }, include: visitInclude });
    await notifyAll({ kind: 'cancel', title: 'Visita cancelada', body: `${updated.visitorName} (${updated.visitDate.split('-').reverse().join('/')})`, visitId: updated.id });
    res.json({ visit: updated });
  }),
);

api.delete(
  '/visits/:id',
  requireAdmin,
  wrap(async (req, res) => {
    await prisma.visit.delete({ where: { id: req.params.id } });
    await prisma.notification.updateMany({ where: { visitId: req.params.id }, data: { visitId: null } });
    res.json({ ok: true });
  }),
);

// ---------- Painel ----------
api.get(
  '/dashboard',
  wrap(async (_req, res) => {
    const today = todayStr();
    const [groups, inside, recent, upcoming, settings] = await Promise.all([
      prisma.visit.groupBy({ by: ['status'], where: { visitDate: today }, _count: true }),
      prisma.visit.count({ where: { status: 'checked_in' } }),
      prisma.visit.findMany({ where: { status: { not: 'cancelled' } }, include: visitInclude, orderBy: { updatedAt: 'desc' }, take: 6 }),
      prisma.visit.count({ where: { status: 'pending', visitDate: { gt: today } } }),
      getSettings(),
    ]);
    const by = Object.fromEntries(groups.map((g) => [g.status, g._count]));
    res.json({
      today,
      companyName: settings.companyName,
      total: (by.pending || 0) + (by.checked_in || 0) + (by.checked_out || 0),
      waiting: by.pending || 0,
      checkedIn: by.checked_in || 0,
      checkedOut: by.checked_out || 0,
      inside,
      upcoming,
      recent,
    });
  }),
);

// ---------- Relatórios ----------
async function summary(from, to) {
  const visits = await prisma.visit.findMany({
    where: { visitDate: { gte: from, lte: to }, status: { not: 'cancelled' } },
    select: { status: true, checkInAt: true, checkOutAt: true, purpose: true, visitDate: true, groupSize: true },
  });
  const durations = visits.filter((v) => v.checkInAt && v.checkOutAt).map((v) => v.checkOutAt - v.checkInAt);
  return {
    visits,
    total: visits.length,
    people: visits.reduce((s, v) => s + v.groupSize, 0),
    checkedIn: visits.filter((v) => v.checkInAt).length,
    checkedOut: visits.filter((v) => v.status === 'checked_out').length,
    pending: visits.filter((v) => v.status === 'pending').length,
    avgMinutes: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60000) : 0,
  };
}

const change = (cur, prev) => (prev === 0 ? (cur === 0 ? 0 : null) : Math.round(((cur - prev) / prev) * 100));

api.get(
  '/reports',
  wrap(async (req, res) => {
    const period = ['daily', 'weekly', 'monthly'].includes(req.query.period) ? req.query.period : 'daily';
    const day = isDay(req.query.date) ? req.query.date : todayStr();
    const { from, to, prev } = periodRange(period, day);
    const [cur, old] = await Promise.all([summary(from, to), summary(prev.from, prev.to)]);
    const keys = ['total', 'people', 'checkedIn', 'checkedOut', 'pending', 'avgMinutes'];
    const metrics = Object.fromEntries(keys.map((k) => [k, { value: cur[k], previous: old[k], change: change(cur[k], old[k]) }]));

    const perDay = [];
    if (period !== 'daily') {
      for (let d = from; d <= to; d = addDays(d, 1)) perDay.push({ day: d, count: cur.visits.filter((v) => v.visitDate === d).length });
    }
    const purposeMap = {};
    for (const v of cur.visits) purposeMap[v.purpose] = (purposeMap[v.purpose] || 0) + 1;
    const byPurpose = Object.entries(purposeMap)
      .map(([purpose, count]) => ({ purpose, count }))
      .sort((a, b) => b.count - a.count);
    res.json({ period, from, to, previous: prev, metrics, perDay, byPurpose });
  }),
);

// ---------- Notificações ----------
api.get(
  '/notifications',
  wrap(async (req, res) => {
    const type = ['visitor', 'system'].includes(req.query.type) ? req.query.type : undefined;
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ notifications });
  }),
);

api.get(
  '/notifications/unread-count',
  wrap(async (req, res) => {
    res.json({ count: await prisma.notification.count({ where: { userId: req.user.id, read: false } }) });
  }),
);

api.post(
  '/notifications/read-all',
  wrap(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
    res.json({ ok: true });
  }),
);

api.post(
  '/notifications/:id/read',
  wrap(async (req, res) => {
    await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: { read: true } });
    res.json({ ok: true });
  }),
);

api.delete(
  '/notifications',
  wrap(async (req, res) => {
    await prisma.notification.deleteMany({ where: { userId: req.user.id } });
    res.json({ ok: true });
  }),
);
