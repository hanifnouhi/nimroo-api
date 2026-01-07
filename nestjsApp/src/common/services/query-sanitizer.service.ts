import { Injectable } from '@nestjs/common';
import { ClassConstructor, instanceToPlain } from 'class-transformer';
import { FilterQuery, ProjectionType, Schema } from 'mongoose';

@Injectable()
export class QuerySanitizerService {
  /**
   * This method is used for validating request filters against Schemas or DTOs
   * @param { Record<string, any> } raw - Object containing filters
   * @param { Schema | ClassConstructor } source - The source against which the validation is based
   * @returns { FilterQuery<T> } Returns instance of FilterQuery
   */
  sanitizeFilter<T>(
    raw: Record<string, any>,
    source: Schema | ClassConstructor<T>,
  ): FilterQuery<T> {
    const allowedFields = this.getAllowedFields(source);
    const sanitized: Record<string, any> = {};
    for (const key in raw) {
      if (allowedFields.includes(key)) {
        sanitized[key] = raw[key];
      }
    }
    return sanitized as FilterQuery<T>;
  }

  /**
   * This method is used for validating request projection againt Schema or DTOs
   * @param { string | undefined } rawProjection - String containing all fields that must be project
   * @param { Schema | ClassConstructor } source - The source against which the validation is based
   * @returns { ProjectionType<T> } Returns instance of ProjectionType
   */
  sanitizeProjection<T>(
    rawProjection: string | undefined,
    source: Schema | ClassConstructor<T>,
  ): ProjectionType<T> {
    const allowedFields = this.getAllowedFields(source);
    const projection: Record<string, number> = {};
    if (rawProjection) {
      rawProjection.split(',').forEach((field) => {
        const trimmed = field.trim();
        if (allowedFields.includes(trimmed)) {
          projection[trimmed] = 1;
        }
      });
    }
    return projection as ProjectionType<T>;
  }

  /**
   * Private method is used for get allowed fields
   * @param { Schema | ClassConstructor } source - The source for getting allowed fields
   * @returns { string[] } Returns array of string icluding field's name
   */
  private getAllowedFields<T>(source: Schema | ClassConstructor<T>): string[] {
    if (source instanceof Schema) {
      return Object.keys(source.paths).filter(
        (field) => !['_id', '__v', 'password'].includes(field),
      );
    } else {
      const plain = instanceToPlain(new source());
      return Object.keys(plain);
    }
  }
}
