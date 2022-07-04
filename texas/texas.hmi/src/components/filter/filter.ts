import {Component, OnDestroy, OnInit} from '@angular/core';
import { FiltersService } from '../../services/filters';
import { Filter } from '../../interfaces';
import { Subscription } from 'rxjs';
import {AlertController} from '@ionic/angular';
import {AlertInput} from '@ionic/core/dist/types/components/alert/alert-interface';

@Component({
  selector: 'filter',
  templateUrl: 'filter.html'
})
export class FilterComponent implements OnInit, OnDestroy {

  sub: Subscription;

  // used by ion-select
  public readonly selectOptions = {
    header: 'Filter',
    subHeader: 'Select categories to view on the map',
    mode: 'md'
  };

  private categories: string[]; // full list of all category names
  private selection: string[];

  // contains names that are not filtered (this is the model for the select)
  constructor(private filtersService: FiltersService,
              public alertController: AlertController) { }

  ngOnInit() {
    this.sub = this.filtersService.filtersChanged$.subscribe((filters: Filter[]) => {
      this.categories = [];
      this.selection = [];
      this.filtersService.filters.forEach((f: Filter) => {
        const name = f.category.categoryName;
        this.categories.push(name);
        if (!f.filtered) {
          this.selection.push(name);
        }
      });
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  change(input: AlertInput): void {
    if (input.checked === true) {
      if (this.selection.find(selection => selection === input.name) === undefined) {
        this.selection.push(input.name);
      }
    } else {
      this.selection = this.selection.filter(selection => selection !== input.name);
    }

    this.filtersService.filters = this.filtersService.filters.map((f: Filter) => {
      f.filtered = !this.selection.find(name => name === f.category.categoryName);
      return f;
    });
  }

  /**
   * Displays the filter checkbox.
   */
  public async presentFilterCheckbox() {

    // Callback that builds the list of selectable inputs.
    const getInputs = () =>  {
      const inputs = [];
      this.categories.forEach(category => {
        inputs.push(
          {
            name: category,
            type: 'checkbox',
            label: category,
            value: category,
            checked: this.selection.find(selection => selection === category) !== undefined,
            handler: this.change.bind(this)
          }
        );
      });
      return inputs;
    };

    // Present the alert.
    const alert = await this.alertController.create({
      header: this.selectOptions.header,
      subHeader: this.selectOptions.subHeader,
      // mode: this.selectOptions.mode,
      inputs: getInputs(),
      buttons: [
        {
          text: 'Ok',
          handler: () => {
          }
        }
      ]
    });

    await alert.present();
  }
}
