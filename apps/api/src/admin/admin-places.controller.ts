import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AdminPlaceInputSchema,
  AdminPlaceListQuerySchema,
  AdminPlaceUpdateSchema,
  type AdminPlace,
  type AdminPlaceList,
  type Regency,
} from '@margi-ai/shared';
import { AdminGuard } from '../auth/auth.guards';
import { parseInput } from '../common/parse-input';
import { AdminPlacesService } from './admin-places.service';

/** Curator console API: every route needs an ADMIN account. */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminPlacesController {
  constructor(private readonly places: AdminPlacesService) {}

  @Get('regencies')
  regencies(): Promise<Regency[]> {
    return this.places.regencies();
  }

  @Get('places')
  list(@Query() query: unknown): Promise<AdminPlaceList> {
    return this.places.list(parseInput(AdminPlaceListQuerySchema, query));
  }

  @Get('places/:id')
  get(@Param('id') id: string): Promise<AdminPlace> {
    return this.places.get(id);
  }

  @Post('places')
  create(@Body() body: unknown): Promise<AdminPlace> {
    return this.places.create(parseInput(AdminPlaceInputSchema, body));
  }

  @Patch('places/:id')
  update(@Param('id') id: string, @Body() body: unknown): Promise<AdminPlace> {
    return this.places.update(id, parseInput(AdminPlaceUpdateSchema, body));
  }

  @Post('places/:id/embed')
  @HttpCode(HttpStatus.OK)
  reembed(@Param('id') id: string): Promise<AdminPlace> {
    return this.places.reembed(id);
  }

  @Delete('places/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivate(@Param('id') id: string): Promise<void> {
    return this.places.deactivate(id);
  }
}
