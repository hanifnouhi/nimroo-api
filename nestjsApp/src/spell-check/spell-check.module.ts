import { Module } from '@nestjs/common';
import { SpellCheckService } from '../spell-check/spell-check.service';

@Module({
  providers: [
    SpellCheckService
  ],
  exports: [
    SpellCheckService
  ]
})
export class SpellCheckModule {}