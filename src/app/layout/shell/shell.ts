import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';

import { Auth } from '../../core/services/auth';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
}

@Component({
  selector: 'app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NgTemplateOutlet,
    ButtonModule,
    DrawerModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);

  protected readonly usuario = this.authService.usuario;
  protected readonly sidebarVisible = signal(false);

  protected readonly navItems: NavItem[] = [
    { label: 'Inicio', icon: 'pi pi-home', route: '/home' },
    { label: 'Merchants', icon: 'pi pi-shop', route: '/merchants' },
    { label: 'Turnos', icon: 'pi pi-ticket', route: '/turnos-configuracion' },
  ];

  protected cerrarSidebar(): void {
    this.sidebarVisible.set(false);
  }

  protected toggleSidebar(): void {
    this.sidebarVisible.update((valor) => !valor);
  }

  protected cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
