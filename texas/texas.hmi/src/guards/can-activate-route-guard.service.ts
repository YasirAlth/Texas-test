import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import { ConfigService } from '../services/config';
import { AlertController } from '@ionic/angular';

@Injectable()
export class CanActivateRouteGuardService implements CanActivate {

  constructor(private config: ConfigService, private router: Router, public popupController: AlertController) {
   }

  /**
   * Route Guard in place for browser device only, for configuration settings not yet in place.
   */

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {

    // Await until the config service is loaded.
    await this.config.configLoaded;

    // If on browser and it's the first time the app is running, force navigation to config page
    if (this.config.isOnDevice() === false && this.config.settings.firstRun === true) {
      this.configPopup();
      this.router.navigate(['/configuration']);
      return false;
    } else {
      return true;
    }
  }

  async configPopup() {
    const popup = await this.popupController.create({
      header: 'Configure System',
      message: 'Settings need to be configured before proceeding.',
      buttons: ['OK']
    });

    popup.present();
  }
}
