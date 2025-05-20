import { IsString } from "class-validator";

export class ChatRequestDto {
  @IsString()
  content: string;
}

export class ChatResponseDto {
  role: string;
  content: string;
}