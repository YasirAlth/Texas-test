import {Component, OnDestroy, OnInit} from '@angular/core';
import { DisplayConfigService, DisplaySettings } from '../../services/display-config';
import { Subscription } from 'rxjs';
import {AlertController} from '@ionic/angular';
import {AlertInput} from '@ionic/core/dist/types/components/alert/alert-interface';

@Component({
  selector: 'marker-config',
  templateUrl: 'marker-config.html'
})
export class MarkerConfigComponent implements OnInit, OnDestroy {

  sub: Subscription;

  // used by ion-select
  public readonly selectOptions = {
    title: 'Marker Configuration',
    subTitle: 'Customise map',
    mode: 'md'
  };

  private readonly labels = DisplayConfigService.SETTING_LABELS;
  private readonly properties = Object.keys(this.labels);

  private currentSettings: DisplaySettings;
  private selection: string[]; // contains the properties that are selected

  constructor(private dcService: DisplayConfigService,
              public alertController: AlertController) {

  }

  ngOnInit() {
    this.sub = this.dcService.settingsChanged$.subscribe(settings => {
      if (settings !== this.currentSettings) {
        // only update the selection if it is from different settings, otherwise this will be recursive!!
        this.selection = Object.keys(settings).filter(property => settings[property]);
      }
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
    // generally casting this to the display settings wouldn't be ideal,
    // but as the property list is based on the static labels from the service,
    // it can be assumed that all the values will be populated
    this.currentSettings = {} as DisplaySettings;

    // update the filter list will updated 'filtered' values
    this.properties.forEach(property => {
      this.currentSettings[property] = this.selection.find(p => {
        return p === property;
      });
    });

    this.dcService.settings = this.currentSettings;
  }

  /**
   * Displays the filter checkbox.
   */
  async presentMarkerConfigCheckbox() {

    // Callback that builds the list of selectable inputs.
    const getInputs = () =>  {
      const inputs = [];
      this.properties.forEach(property => {
        inputs.push(
          {
            name: property,
            type: 'checkbox',
            label: this.labels[property],
            value: property,
            checked: this.selection.find(selection => selection === property) !== undefined,
            handler:  this.change.bind(this)
          }
        );
      });
      return inputs;
    };

    // Present the alert.
    const alert = await this.alertController.create({
      header: this.selectOptions.title,
      subHeader: this.selectOptions.subTitle,
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
