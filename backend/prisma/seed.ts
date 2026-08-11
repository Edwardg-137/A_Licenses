/**
 * Seed del MVP — PermisoGT.
 *
 * Crea:
 *  - Tenant "Municipalidad de Guatemala"
 *  - Usuarios de prueba para testing manual: 2 de cada rol (Admin, Revisor, Inspector,
 *    Solicitante); todos ACTIVE; credenciales en Docs/status/general.md y README.md
 *  - Tipo de licencia L-01 (F08) con D-01…D-15
 *  - Tipo de licencia L-02 (F02) con D-01…D-15 (D-14 = F02) + D-16…D-21 opcionales
 */
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PDF = 'application/pdf';
const JPG = 'image/jpeg';
const DWG = 'image/vnd.dwg';

type ReqSeed = {
  code: string;
  name: string;
  mimes: string[];
  help: string | null;
  stage?: string;
  required?: boolean;
};

const L01_REQUIREMENTS: ReqSeed[] = [
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
  { code: 'D-15', name: 'Comprobante de pago de tasa municipal', mimes: [PDF, JPG], help: 'Se carga después del cálculo y aprobación técnica', stage: 'PAGO' },
];

/** L-02: mismos obligatorios que L-01 (D-14 = F02) + extras opcionales del mapeo. */
const L02_REQUIREMENTS: ReqSeed[] = [
  ...L01_REQUIREMENTS.map((r) =>
    r.code === 'D-14'
      ? {
          ...r,
          name: 'Formulario municipal de solicitud (F02)',
          help: 'Firmado por propietario y profesional; sin tachones (PLTF.02)',
        }
      : r.code === 'D-07'
        ? { ...r, help: 'Categoría según el tipo de proyecto (no limitada a C/CR)' }
        : r,
  ),
  {
    code: 'D-16',
    name: 'Factibilidad de Gestión Urbana (FGU)',
    mimes: [PDF],
    help: 'Opcional según características del proyecto comercial/mixto',
    required: false,
  },
  {
    code: 'D-17',
    name: 'Dictamen CONRED (NRD-1 / NRD-2)',
    mimes: [PDF],
    help: 'Opcional; según magnitud y riesgo del proyecto',
    required: false,
  },
  {
    code: 'D-18',
    name: 'Planos de seguridad y evacuación',
    mimes: [PDF, DWG],
    help: 'Opcional; típico en establecimientos abiertos al público',
    required: false,
  },
  {
    code: 'D-19',
    name: 'Factibilidad de agua (EMPAGUA)',
    mimes: [PDF],
    help: 'Opcional; cuando aplique dotación o introducción de servicios',
    required: false,
  },
  {
    code: 'D-20',
    name: 'Informe industrial (simple o completo)',
    mimes: [PDF],
    help: 'Opcional; si el formulario indica informe industrial',
    required: false,
  },
  {
    code: 'D-21',
    name: 'Requisitos DMA por tala de árboles',
    mimes: [PDF],
    help: 'Opcional; si el proyecto incluye tala de árboles',
    required: false,
  },
];

interface SeedUser {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  collegeType?: 'CIG' | 'CAG';
  collegeNumber?: string;
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@permisogt.local',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    fullName: 'Carmen Administradora',
    role: 'ADMIN',
  },
  {
    email: 'revisor@permisogt.local',
    password: 'Revisor123',
    fullName: 'Roberto Revisor',
    role: 'REVISOR',
  },
  {
    email: 'inspector@permisogt.local',
    password: 'Inspector123',
    fullName: 'Ingrid Inspector',
    role: 'INSPECTOR',
  },
  {
    email: 'solicitante@permisogt.local',
    password: 'Solicita123',
    fullName: 'Ana Arquitecta',
    role: 'SOLICITANTE',
    collegeType: 'CAG',
    collegeNumber: 'CAG-4521',
  },
  {
    email: 'admin2@permisogt.local',
    password: 'Admin456!',
    fullName: 'Luis Administrador',
    role: 'ADMIN',
  },
  {
    email: 'revisor2@permisogt.local',
    password: 'Revisor456',
    fullName: 'María Revisora',
    role: 'REVISOR',
  },
  {
    email: 'inspector2@permisogt.local',
    password: 'Inspector456',
    fullName: 'Pedro Inspector',
    role: 'INSPECTOR',
  },
  {
    email: 'solicitante2@permisogt.local',
    password: 'Solicita456',
    fullName: 'Carlos Ingeniero',
    role: 'SOLICITANTE',
    collegeType: 'CIG',
    collegeNumber: 'CIG-8832',
  },
];

async function upsertLicenseTypeWithRequirements(params: {
  tenantId: string;
  code: string;
  name: string;
  formCode: string;
  feeFormula: object;
  requirements: ReqSeed[];
}) {
  const licenseType = await prisma.licenseType.upsert({
    where: { tenantId_code: { tenantId: params.tenantId, code: params.code } },
    update: {
      name: params.name,
      formCode: params.formCode,
      feeFormula: params.feeFormula,
      active: true,
    },
    create: {
      tenantId: params.tenantId,
      code: params.code,
      name: params.name,
      formCode: params.formCode,
      maxCorrectionRounds: 3,
      feeFormula: params.feeFormula,
    },
  });

  for (const [index, req] of params.requirements.entries()) {
    const stage = req.stage ?? 'INGRESO';
    const required = req.required !== false;
    await prisma.documentRequirement.upsert({
      where: { licenseTypeId_code: { licenseTypeId: licenseType.id, code: req.code } },
      update: {
        name: req.name,
        helpText: req.help,
        allowedMimeTypes: req.mimes,
        required,
        sortOrder: index + 1,
        stage,
      },
      create: {
        licenseTypeId: licenseType.id,
        code: req.code,
        name: req.name,
        helpText: req.help,
        allowedMimeTypes: req.mimes,
        required,
        sortOrder: index + 1,
        stage,
      },
    });
  }

  return licenseType;
}

async function main() {
  const tenantSlug = process.env.DEFAULT_TENANT_SLUG ?? 'guatemala';

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {},
    create: {
      slug: tenantSlug,
      name: 'Municipalidad de Guatemala',
      settings: {
        maxCorrectionRounds: 3,
        paymentMode: 'SIMULATED',
      },
    },
  });

  for (const seedUser of SEED_USERS) {
    const passwordHash = await bcrypt.hash(seedUser.password, 10);
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: seedUser.email } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: seedUser.email,
        passwordHash,
        fullName: seedUser.fullName,
        role: seedUser.role,
        status: 'ACTIVE',
        collegeType: seedUser.collegeType,
        collegeNumber: seedUser.collegeNumber,
      },
    });
  }

  await upsertLicenseTypeWithRequirements({
    tenantId: tenant.id,
    code: 'L-01',
    name: 'Obra Mayor — Vivienda Unifamiliar',
    formCode: 'F08',
    feeFormula: { base: 500, porcentajePresupuesto: 0.001 },
    requirements: L01_REQUIREMENTS,
  });

  await upsertLicenseTypeWithRequirements({
    tenantId: tenant.id,
    code: 'L-02',
    name: 'Obra Mayor — Comercial / Mixto / General (F02)',
    formCode: 'F02',
    feeFormula: { base: 800, porcentajePresupuesto: 0.0015 },
    requirements: L02_REQUIREMENTS,
  });

  console.log(
    `Seed completado: tenant "${tenant.name}", ${SEED_USERS.length} usuarios de prueba, L-01 (F08) y L-02 (F02) con requisitos.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
