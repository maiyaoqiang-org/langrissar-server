import { SetMetadata } from '@nestjs/common';

export const BYPASS_TRANSFORM_KEY = 'bypassTransform';
export const BypassTransformInterceptor = () => SetMetadata(BYPASS_TRANSFORM_KEY, true);