import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Subscription } from 'rxjs';

import { Item } from '../../../../../classes/item';
import { Valor } from '../../../../../classes/valor';

import { EntrevistasService } from '../../../../../services/entrevistas/entrevistas.service';
import { NavegacionService } from '../../../../../services/navegacion/navegacion.service';
import { CuadroDialogoService } from '../../../../../services/cuadro-dialogo/cuadro-dialogo.service';
import { HttpErrorHandlerService } from '../../../../../services/error-handler/http-error-handler.service';
import { SpinnerService } from '../../../../../services/spinner/spinner.service';

@Component({
  selector: 'app-items',
  templateUrl: './items.component.html',
  styleUrls: ['./items.component.css']
})
export class ItemsComponent implements OnInit {
  
  @ViewChild("otroField") otroField: ElementRef;

  /**
   * Centra el cursor en el campo de "Respuesta personalizada" cuando se seleciona la opción "Otro"
   */
  autofocus(valor: string): void {
    if (valor == 'Otro' && this.valoresSeleccionados.indexOf(valor) >= 0) {
      setTimeout(() => {
        this.otroField.nativeElement.focus();
      }, 100);
    }
  }

  spinner: boolean = false;
  private _spinnerSubscription: Subscription;

  item: Item;
  valor: Valor;
  valor_personal: string;
  private valoresSeleccionados: string[];

  constructor(
    private route: ActivatedRoute,
    private entrevistasService: EntrevistasService,
    private navegacionService: NavegacionService,
    private spinnerService: SpinnerService,
    private cuadroDialogoService: CuadroDialogoService,
    private errorHandler: HttpErrorHandlerService
  ) {
    this._spinnerSubscription = this.spinnerService.estadoSpinnerObservable.subscribe(
      estado => this.spinner = estado
    );
  }

  ngOnInit() {
    this.extraerItem(+this.route.snapshot.paramMap.get('id'));
  }

  ngOnDestroy() {
    this._spinnerSubscription.unsubscribe();
  }

  /**
   * Controla la navegación desde la ruta actual hacia el exterior
   */
  canDeactivate(
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot
  ): Promise<boolean> | boolean {
    if (this.item && nextState.url != '/login') {
      return this.cuadroDialogoService.advertencia(
        '¿Desea abandonar la entrevista actual sin finalizarla?', 
        'Se perderán los cambios no guardados.'
      ).then(
        res => {
          if(res) {
            return true;
          } else {
            return false;
          }
        }
      );
    } else {
      return true;
    }
  }

  /**
   * Lista la pregunta extraida por el servidor
   */
  extraerItem(id: number): void {
    this.entrevistasService.getItem(id).subscribe(
      item => {
        if(item) {
          //TODO: Fichero de logs
          console.log('SERVIDOR - Item extraído: ' + item.titulo);
          this.item = item;
        } else {
          console.error('LOG getItem() (no hay más items)');
          this.navegacionService.navegar(`/dashboard/entrevistas/${id}/fin`, true);
        }
      },
      error => {
        this.errorHandler.handleError(error, `getItem(${id})`);
      }
    )
  }

  /**
   * Envía la respuesta del usuario y actualiza el contexto (limpia los campos obsoletos y extrae nuevo item)
   */
  enviarValor(id_entrevista: number, valor: Valor): void {
    this.entrevistasService.postValor(id_entrevista, valor).subscribe(
      datos => {
        if(datos.alerta) {
          this.cuadroDialogoService.alerta(
            'Según los resultados reportados, es necesario que siga las siguientes intrucciones:',
            datos.alerta
          ).then(
            res => {
              console.log('SERVIDOR - Confirmación respuesta usuario: ');
              console.log(datos.valor.id); console.log(datos.valor.valor); console.log(datos.valor.valorTexto);
              this.clearItemActual();
              this.clearValorActual();
              this.extraerItem(id_entrevista);
            }
          );
        } else if(datos.valor) {
          console.log('SERVIDOR - Confirmación respuesta usuario: ');
          console.log(datos.valor.id); console.log(datos.valor.valor); console.log(datos.valor.valorTexto);
          this.clearItemActual();
          this.clearValorActual();
          this.extraerItem(id_entrevista);
        } else {
          // TODO: Tratamiento del error/Mensaje de error al usuario (footer popup)
          console.error('ERROR enviarValor()');
        }
      },
      error => {
        //TODO: Fichero de logs
        this.errorHandler.handleError(error, `enviarValor(${id_entrevista}, ${valor})`);
      }
    )
  }

  /**
   * Actualiza los valores de la respuesta del usuario
   */
  setValor(id: number, valor: string): void {
    if(this.item.tipo === 'radio') { // RADIO BUTTON
      this.valoresSeleccionados = [valor];
    } else if(this.item.tipo === 'checkbox') { // CHECKBOX
      if(!this.valoresSeleccionados) {
        this.valoresSeleccionados = [valor];
      } else if(this.valoresSeleccionados.indexOf(valor) >= 0) {
        this.valoresSeleccionados.splice(this.valoresSeleccionados.indexOf(valor), 1);
      } else {
        this.valoresSeleccionados.push(valor);
      }
    }

    this.autofocus(valor);

    this.valor = {
      id: id,
      titulo: this.item.titulo,
      tipo: this.item.tipo,
      valores: this.valoresSeleccionados
    }
  }

  /**
   * Registra la respuesta de usuario
   */
  responder(): void {
    const id = +this.route.snapshot.paramMap.get('id');
    if(this.valoresSeleccionados.indexOf('Otro') >= 0 && this.valor_personal != null  && this.valor_personal != ' ') {
      this.valor.valores[this.valoresSeleccionados.indexOf('Otro')] = this.valor_personal;
    }
    this.enviarValor(id, this.valor);
  }

  /**
   * Limpia la pregunta actual
   */
  clearItemActual(): void {
    this.item = null;
  }

  /**
   * Limpia la respuesta del usuario
   */
  clearValorActual(): void {
    this.valor = null;
    this.valoresSeleccionados = null;
    this.valor_personal = null;
  }

}
