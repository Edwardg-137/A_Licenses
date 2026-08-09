/**
 * Seed inicial del MVP:
 *  - Tenant "Municipalidad de Guatemala"
 *  - Usuario Admin municipal (credenciales desde .env)
 *  - Tipo de licencia L-01 (F08) con los 15 requisitos documentales D-01…D-15
 *    (fuente: mvp_docs/04-tipos-licencia-y-requisitos.md §2.3)
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PDF = 'application/pdf';
const JPG = 'image/jpeg';
const DWG = 'image/vnd.dwg';

const L01_REQUIREMENTS = [
  { code: 'D-01', name: 'DPI del propietario (ambas caras)', mimes: [PDF, JPG], help: 'Documento vigente' },
  { code: 'D-02', name: 'Certificación del RGP', mimes: [PDF], help: 'Vigencia no mayor a 3 meses' },
  { code: 'D-03', name: 'Escritura del inmueble', mimes: [PDF], help: 'Copia simple de escritura pública' },
  { code: 'D-04', name: 'Solvencia de IUSI', mimes: [PDF], help: 'Emitida por la municipalidad' },
  { code: 'D-05', name: 'Solvencia de agua / servicios', mimes: [PDF], help: null },
  { code: 'D-06', name: 'Boleto de Ornato', mimes: [PDF, JPG], help: 'Del propietario Y del profesional responsable; vigencia anual' },
  { code: 'D-07', name: 'Resolución ambiental MARN (BIAWEB)', mimes: [PDF], help: 'Categoría C o CR' },
  { code: 'D-08', name: 'Planos de arquitectura (timbrados)', mimes: [PDF, DWG], help: 'Firmados por profesional colegiado' },
  { code: 'D-09', name: 'Planos estructurales (timbrados)', mimes: [PDF, DWG], help: 'Con timbres del CIG o CAG' },
  { code: 'D-10', name: 'Planos de instalaciones (hidráulicas/eléctricas)', mimes: [PDF, DWG], help: null },
  { code: 'D-11', name: 'Memoria de cálculo estructural', mimes: [PDF], help: null },
  { code: 'D-12', name: 'Presupuesto estimado de obra', mimes: [PDF], help: 'Base para el cálculo de timbre y tasa' },
  { code: 'D-13', name: 'Cronograma de actividades', mimes: [PDF], help: 'Plazo estimado de la obra por etapas' },
  { code: 'D-14', name: 'Formulario municipal de solicitud (F08)', mimes: [PDF], help: 'Firmado por propietario y profesional; sin tachones' },
  { code: 'D-15', name: 'Comprobante de pago de tasa municipal', mimes: [PDF, JPG], help: 'Se carga después del cálculo y aprobación técnica' },
];

async function main() {
  const tenantSlug = process.env.DEFAULT_TENANT_SLUG ?? 'guatemala';
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@permisogt.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {},
    create: {
      slug: tenantSlug,
      name: 'Municipalidad de Guatemala',
      settings: {
        maxCorrectionRounds: 3,
        paymentMode: 'SIMULATED', // MVP: pago en línea simulado (decisión D-004)
      },
    },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: adminEmail } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      passwordHash,
      fullName: 'Administrador Municipal',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const licenseType = await prisma.licenseType.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'L-01' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'L-01',
      name: 'Obra Mayor — Vivienda Unifamiliar',
      formCode: 'F08',
      maxCorrectionRounds: 3,
      // Valores provisionales; se reemplazarán con el arancel real (pendiente)
      feeFormula: { base: 500, porcentajePresupuesto: 0.001 },
    },
  });

  for (const [index, req] of L01_REQUIREMENTS.entries()) {
    await prisma.documentRequirement.upsert({
      where: { licenseTypeId_code: { licenseTypeId: licenseType.id, code: req.code } },
      update: {},
      create: {
        licenseTypeId: licenseType.id,
        code: req.code,
        name: req.name,
        helpText: req.help,
        allowedMimeTypes: req.mimes,
        required: true,
        sortOrder: index + 1,
      },
    });
  }

  console.log(`Seed completado: tenant "${tenant.name}", admin ${adminEmail}, L-01 con ${L01_REQUIREMENTS.length} requisitos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
