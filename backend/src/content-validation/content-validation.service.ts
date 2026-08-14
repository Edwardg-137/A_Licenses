import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateAddress } from './address';
import { analyzeWithGemini } from './vision.gemini';
import { crossCheckFormAndDocuments } from './cross-check';
import { isValidGuatemalaNit } from './nit';
import { assessQuality } from './quality';
import {
  CheckStatus,
  ContentCheck,
  CrossCheckIssue,
  FieldCheck,
  FormValidation,
  worstStatus,
} from './types';

@Injectable()
export class ContentValidationService {
  constructor(private readonly config: ConfigService) {}

  private googleKey(): string | undefined {
    return this.config.get<string>('GOOGLE_MAPS_API_KEY') || undefined;
  }

  private geminiKey(): string | undefined {
    return this.config.get<string>('GEMINI_API_KEY') || undefined;
  }

  private geminiModel(): string {
    return this.config.get<string>('GEMINI_MODEL') || 'gemini-3.6-flash';
  }

  async validateForm(form: {
    direccionExacta: string;
    zona: string;
    nitPropietario: string;
    finca: string;
    folio: string;
    libro: string;
  }): Promise<FormValidation> {
    const nitOk = isValidGuatemalaNit(form.nitPropietario);
    const nit: FieldCheck = nitOk
      ? { status: 'ok', message: 'NIT con dígito verificador válido (o CF)' }
      : {
          status: 'fail',
          message:
            'El NIT no es válido. Use el formato SAT (incluye dígito verificador) o CF para consumidor final.',
        };

    const rgpBits = [form.finca, form.folio, form.libro].map((v) => String(v ?? '').trim());
    const rgp: FieldCheck = rgpBits.every((v) => v.length >= 1)
      ? { status: 'ok', message: 'Finca, folio y libro informados' }
      : { status: 'fail', message: 'Complete finca, folio y libro del RGP' };

    const address = await validateAddress(form.direccionExacta, form.zona, this.googleKey());
    const overall = worstStatus([nit.status, address.check.status, rgp.status]);
    return {
      overall,
      nit,
      address: address.check,
      rgp,
      engines: { nit: 'sat-checksum', address: address.engine },
    };
  }

  hasBlockingFail(validation: FormValidation): boolean {
    return validation.overall === 'fail';
  }

  async analyzeDocument(input: {
    buffer: Buffer;
    mimeType: string;
    requirementCode: string;
    formCode: string;
  }): Promise<ContentCheck> {
    const analyzedAt = new Date().toISOString();
    const quality = await assessQuality(input.buffer, input.mimeType);
    const vision = await analyzeWithGemini({
      buffer: input.buffer,
      mimeType: input.mimeType,
      requirementCode: input.requirementCode,
      formCode: input.formCode,
      apiKey: this.geminiKey(),
      model: this.geminiModel(),
    });

    const issues = [...vision.issues];
    if (quality.status === 'fail') {
      issues.unshift({ severity: 'fail', code: 'QUALITY', message: quality.message });
    } else if (quality.status === 'warn') {
      issues.unshift({ severity: 'warn', code: 'QUALITY', message: quality.message });
    }

    const overall: CheckStatus = worstStatus([quality.status, vision.check.status]);
    return {
      overall,
      quality,
      semantic: vision.check,
      extracted: vision.extracted,
      issues,
      engine: vision.engine,
      analyzedAt,
    };
  }

  crossCheck(input: {
    formData: Record<string, unknown>;
    documents: { code: string; extracted?: Record<string, string | number | boolean | null> }[];
    collegeNumber?: string | null;
    paymentAmount?: number | null;
  }): CrossCheckIssue[] {
    return crossCheckFormAndDocuments(input);
  }
}
