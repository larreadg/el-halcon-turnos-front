export interface CaptchaData {
  captcha_token: string;
  captcha_imagen: string;
}

export interface LoginRequest {
  usuario: string;
  clave: string;
  captcha_token: string;
  captcha_respuesta: string;
}

export interface LoginResponse {
  token: string;
  usuario: string;
}
