import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class NavegacionService {

  constructor(
    private router: Router
  ) { }

  /**
   * Redirige al usuario a la URL especificada
   */
  navegar(url: string, borrarHistorial: boolean): void {
    this.router.navigate([url], { replaceUrl: borrarHistorial });
  }

}