import { Module } from '@nestjs/common';
import { TransitController } from './transit.controller';

@Module({ controllers: [TransitController] })
export class TransitModule {}
