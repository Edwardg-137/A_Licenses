import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UsersService } from './users.service';

@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListUsersDto) {
    return this.usersService.list(user.tenantId, query);
  }

  @Post('internal')
  createInternal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInternalUserDto,
  ) {
    return this.usersService.createInternal(user.tenantId, dto);
  }

  @Patch(':id/approve')
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.approve(user.tenantId, id);
  }

  @Patch(':id/activate')
  activate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.setActive(user.tenantId, id, true);
  }

  @Patch(':id/deactivate')
  deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.setActive(user.tenantId, id, false);
  }
}
