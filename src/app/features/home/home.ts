import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly authService = inject(Auth);
}
