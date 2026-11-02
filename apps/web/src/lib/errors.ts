import type { ErrorCode } from '@margi-ai/shared';

export function mapErrorCodeToMessage(code: ErrorCode, t?: (key: string) => string): string {
  const translate = t ?? ((key: string) => key);

  switch (code) {
    case 'NOT_A_SCENE':
      return translate('analyzer.notASceneMessage');
    case 'ANALYSIS_IMAGE_INVALID':
      return translate('analyzer.imageInvalidMessage');
    case 'RATE_LIMITED':
      return translate('common.rateLimitedMessage');
    case 'TIMEOUT':
      return translate('common.timeoutMessage');
    case 'FORBIDDEN':
      return translate('common.forbiddenMessage');
    default:
      return translate('common.genericErrorMessage');
  }
}
