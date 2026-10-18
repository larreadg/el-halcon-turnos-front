import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth-guard';
import { Login } from './features/auth/login/login';
import { Home } from './features/home/home';
import { Boxes } from './features/boxes/boxes';
import { Merchants } from './features/merchants/merchants';
import { PantallaTurnos } from './features/pantalla-turnos/pantalla-turnos';
import { TurnosConfiguracion } from './features/turnos-configuracion/turnos-configuracion';
import { Shell } from './layout/shell/shell';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'pantalla', component: PantallaTurnos },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: 'home', component: Home },
      { path: 'boxes', component: Boxes },
      { path: 'merchants', component: Merchants },
      { path: 'turnos-configuracion', component: TurnosConfiguracion },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];
