/** Request/response DTOs for authentication endpoints. */

export interface RegisterRequestDto {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface UserDto {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface AuthResponseDto {
  user: UserDto;
  token: string;
}
