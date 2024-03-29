import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';

import { DashboardComponent } from './components/dashboard/dashboard.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { NotificacionesComponent } from './components/notificaciones/notificaciones.component';
import { EntrevistasComponent } from './components/entrevistas/entrevistas/entrevistas.component';
import { EntrevistasListaComponent } from './components/entrevistas/entrevistas-lista/entrevistas-lista.component';
import { EntrevistasInstruccionesComponent } from './components/entrevistas/entrevistas-instrucciones/entrevistas-instrucciones.component';
import { ItemsComponent } from './components/entrevistas/items/items.component';
import { ItemsFinComponent } from './components/entrevistas/items-fin/items-fin.component';
import { ControlComponent } from './components/control/control.component';

import { DashboardRoutingModule } from './dashboard-routing.module';

// Componentes externos & Angular Material
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [
    DashboardComponent,
    InicioComponent,
    PerfilComponent,
    NotificacionesComponent,
    EntrevistasComponent,
    EntrevistasListaComponent,
    EntrevistasInstruccionesComponent,
    ItemsComponent,
    ItemsFinComponent,
    ControlComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    FlexLayoutModule,
    MatToolbarModule,
    MatSidenavModule,
    MatCardModule,
    MatListModule,
    MatGridListModule,
    MatBadgeModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatRadioModule,
    MatCheckboxModule,
    MatSelectModule,
    MatInputModule,
    MatDividerModule,
    NgbPaginationModule,
    DashboardRoutingModule
  ]
})
export class DashboardModule { }
