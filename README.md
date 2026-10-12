# Visitante

Controle de visitantes: cadastro (individual ou grupo) com check-in imediato, pré-registro com QR Code, check-in pela câmera (QR) ou manual, check-out com tempo de permanência, histórico por data, notificações, relatórios diário/semanal/mensal com exportação CSV, anfitriões (funcionários), equipe com permissões e perfil da empresa.

- frontend/: React + Vite + Tailwind (jsQR para ler, qrcode para gerar).
- backend/: Express + Prisma (PostgreSQL).
- Login inicial: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD do .env.example. Novos usuários são criados pelo admin em Perfil → Equipe (o cadastro público pode ser liberado em Configurações).
