import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VehicleClass } from '@prisma/client';
import { type AuthPrincipal, CurrentUser } from '../../../core/auth';
import { VendorAccessGuard, VendorPermissionRequired } from '../../vendors';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  UpsertCabFareDto,
  VehicleResponse,
} from '../dto/cabs.dto';
import {
  CreateExperienceDto,
  CreateSlotsDto,
  ExperienceResponse,
  SlotResponse,
  UpdateExperienceDto,
} from '../dto/experiences.dto';
import {
  CreateMenuItemDto,
  CreateRestaurantDto,
  MenuItemResponse,
  RestaurantResponse,
  UpdateMenuItemDto,
  UpdateRestaurantDto,
} from '../dto/food.dto';
import {
  CalendarDayResponse,
  CalendarQueryDto,
  CreateHotelDto,
  CreateRoomTypeDto,
  HotelResponse,
  RoomTypeResponse,
  UpdateCalendarDto,
  UpdateHotelDto,
  UpdateRoomTypeDto,
} from '../dto/hotels.dto';
import { CabsService } from '../services/cabs.service';
import { ExperiencesService } from '../services/experiences.service';
import { HotelsService } from '../services/hotels.service';
import { RestaurantsService } from '../services/restaurants.service';
import { RoomInventoryService } from '../services/room-inventory.service';

const UUID = new ParseUUIDPipe();

@ApiTags('vendor · listings')
@ApiBearerAuth()
@UseGuards(VendorAccessGuard)
@VendorPermissionRequired('listings.edit')
@Controller('vendors/:vid')
export class VendorInventoryController {
  constructor(
    private readonly hotels: HotelsService,
    private readonly rooms: RoomInventoryService,
    private readonly cabs: CabsService,
    private readonly restaurants: RestaurantsService,
    private readonly experiences: ExperiencesService,
  ) {}

  // hotels
  @Get('hotels')
  @VendorPermissionRequired(null)
  @ApiOkResponse({ type: [HotelResponse] })
  listHotels(@Param('vid', UUID) vid: string) {
    return this.hotels.listForVendor(vid);
  }

  @Post('hotels')
  createHotel(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Body() dto: CreateHotelDto,
  ): Promise<HotelResponse> {
    return this.hotels.create(u, vid, dto);
  }

  @Patch('hotels/:id')
  updateHotel(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
    @Body() dto: UpdateHotelDto,
  ): Promise<HotelResponse> {
    return this.hotels.update(u, vid, id, dto);
  }

  @Delete('hotels/:id')
  @HttpCode(204)
  async deleteHotel(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
  ): Promise<void> {
    await this.hotels.remove(u, vid, id);
  }

  @Post('hotels/:id/room-types')
  createRoomType(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
    @Body() dto: CreateRoomTypeDto,
  ): Promise<RoomTypeResponse> {
    return this.hotels.createRoomType(u, vid, id, dto);
  }

  @Patch('room-types/:rtid')
  updateRoomType(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('rtid', UUID) rtid: string,
    @Body() dto: UpdateRoomTypeDto,
  ): Promise<RoomTypeResponse> {
    return this.hotels.updateRoomType(u, vid, rtid, dto);
  }

  @Delete('room-types/:rtid')
  @HttpCode(204)
  async deleteRoomType(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('rtid', UUID) rtid: string,
  ): Promise<void> {
    await this.hotels.removeRoomType(u, vid, rtid);
  }

  @Get('room-types/:rtid/inventory')
  @VendorPermissionRequired('inventory.edit')
  @ApiOkResponse({ type: [CalendarDayResponse] })
  async calendar(
    @Param('vid', UUID) vid: string,
    @Param('rtid', UUID) rtid: string,
    @Query() q: CalendarQueryDto,
  ): Promise<CalendarDayResponse[]> {
    await this.hotels.ownedRoomType(vid, rtid);
    return this.rooms.calendar(rtid, q.from, q.to);
  }

  @Put('room-types/:rtid/inventory')
  @VendorPermissionRequired('inventory.edit')
  @ApiOperation({
    summary:
      'Bulk-edit nights: price, rooms in inventory, stop-sell (optionally only some weekdays)',
  })
  @ApiOkResponse({ type: [CalendarDayResponse] })
  async updateCalendar(
    @Param('vid', UUID) vid: string,
    @Param('rtid', UUID) rtid: string,
    @Body() dto: UpdateCalendarDto,
  ): Promise<CalendarDayResponse[]> {
    await this.hotels.ownedRoomType(vid, rtid);
    return this.rooms.updateCalendar(rtid, dto);
  }

  // cabs
  @Get('vehicles')
  @VendorPermissionRequired(null)
  @ApiOkResponse({ type: [VehicleResponse] })
  listVehicles(@Param('vid', UUID) vid: string): Promise<VehicleResponse[]> {
    return this.cabs.listVehicles(vid);
  }

  @Post('vehicles')
  createVehicle(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Body() dto: CreateVehicleDto,
  ): Promise<VehicleResponse> {
    return this.cabs.createVehicle(u, vid, dto);
  }

  @Patch('vehicles/:id')
  updateVehicle(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<VehicleResponse> {
    return this.cabs.updateVehicle(u, vid, id, dto);
  }

  @Delete('vehicles/:id')
  @HttpCode(204)
  async deleteVehicle(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
  ): Promise<void> {
    await this.cabs.removeVehicle(u, vid, id);
  }

  @Get('cab-fares')
  @VendorPermissionRequired(null)
  listFares(@Param('vid', UUID) vid: string) {
    return this.cabs.listFares(vid);
  }

  @Put('cab-fares/:class')
  upsertFare(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('class', new ParseEnumPipe(VehicleClass)) vehicleClass: VehicleClass,
    @Body() dto: UpsertCabFareDto,
  ) {
    return this.cabs.upsertFare(u, vid, vehicleClass, dto);
  }

  // restaurants
  @Get('restaurants')
  @VendorPermissionRequired(null)
  @ApiOkResponse({ type: [RestaurantResponse] })
  listRestaurants(@Param('vid', UUID) vid: string): Promise<RestaurantResponse[]> {
    return this.restaurants.listForVendor(vid);
  }

  @Post('restaurants')
  createRestaurant(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Body() dto: CreateRestaurantDto,
  ): Promise<RestaurantResponse> {
    return this.restaurants.create(u, vid, dto);
  }

  @Patch('restaurants/:id')
  updateRestaurant(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
    @Body() dto: UpdateRestaurantDto,
  ): Promise<RestaurantResponse> {
    return this.restaurants.update(u, vid, id, dto);
  }

  @Delete('restaurants/:id')
  @HttpCode(204)
  async deleteRestaurant(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
  ): Promise<void> {
    await this.restaurants.remove(u, vid, id);
  }

  @Post('restaurants/:id/menu-items')
  createMenuItem(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
    @Body() dto: CreateMenuItemDto,
  ): Promise<MenuItemResponse> {
    return this.restaurants.createMenuItem(u, vid, id, dto);
  }

  @Patch('menu-items/:id')
  @VendorPermissionRequired('inventory.edit')
  updateMenuItem(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
    @Body() dto: UpdateMenuItemDto,
  ): Promise<MenuItemResponse> {
    return this.restaurants.updateMenuItem(u, vid, id, dto);
  }

  @Delete('menu-items/:id')
  @HttpCode(204)
  async deleteMenuItem(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
  ): Promise<void> {
    await this.restaurants.removeMenuItem(u, vid, id);
  }

  // experiences
  @Get('experiences')
  @VendorPermissionRequired(null)
  @ApiOkResponse({ type: [ExperienceResponse] })
  listExperiences(@Param('vid', UUID) vid: string): Promise<ExperienceResponse[]> {
    return this.experiences.listForVendor(vid);
  }

  @Post('experiences')
  createExperience(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Body() dto: CreateExperienceDto,
  ): Promise<ExperienceResponse> {
    return this.experiences.create(u, vid, dto);
  }

  @Patch('experiences/:id')
  updateExperience(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
    @Body() dto: UpdateExperienceDto,
  ): Promise<ExperienceResponse> {
    return this.experiences.update(u, vid, id, dto);
  }

  @Delete('experiences/:id')
  @HttpCode(204)
  async deleteExperience(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
  ): Promise<void> {
    await this.experiences.remove(u, vid, id);
  }

  @Post('experiences/:id/slots')
  @VendorPermissionRequired('inventory.edit')
  @ApiOperation({ summary: 'Create slots for every date × time (IST)' })
  createSlots(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
    @Body() dto: CreateSlotsDto,
  ): Promise<SlotResponse[]> {
    return this.experiences.createSlots(u, vid, id, dto);
  }

  @Delete('experience-slots/:slotId')
  @VendorPermissionRequired('inventory.edit')
  @HttpCode(204)
  async deleteSlot(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('slotId', UUID) slotId: string,
  ): Promise<void> {
    await this.experiences.removeSlot(u, vid, slotId);
  }
}
