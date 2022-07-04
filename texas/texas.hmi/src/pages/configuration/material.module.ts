import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatStepperModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatIconModule } from '@angular/material';


@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  exports: [
    MatStepperModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatFormFieldModule,
  ]
})
export class MaterialModule { }
