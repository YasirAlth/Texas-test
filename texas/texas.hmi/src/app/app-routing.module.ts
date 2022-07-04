import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { CanActivateRouteGuardService } from 'src/guards/can-activate-route-guard.service';

const routes: Routes = [
  { path: '', redirectTo: 'sa-container', pathMatch: 'full' },
  { path: 'about', loadChildren: () => import('../pages/about/about.module').then(m => m.AboutPageModule) },
  { path: 'chat', loadChildren: () => import('../pages/chat/chat.module').then(m => m.ChatPageModule), canActivate: [CanActivateRouteGuardService] },
  { path: 'replay', loadChildren: () => import('../pages/replay/replay.module').then(m => m.ReplayPageModule), canActivate: [CanActivateRouteGuardService] },
  { path: 'settings', loadChildren: () => import('../pages/settings/settings.module').then(m => m.SettingsPageModule), canActivate: [CanActivateRouteGuardService] },
  { path: 'track-control/:deviceId', loadChildren: () => import('../pages/track-control/track-control.module').then(m => m.TrackControlPageModule), canActivate: [CanActivateRouteGuardService] },
  { path: 'track-list', loadChildren: () => import('../pages/track-list/track-list.module').then(m => m.TrackListPageModule), canActivate: [CanActivateRouteGuardService]},
  { path: 'configuration', loadChildren: () => import('../pages/configuration/configuration.module').then(m => m.ConfigurationPageModule) },
  { path: 'sa-container', loadChildren: () => import('../pages/sa-container/sa-container.module').then(m => m.SaContainerPageModule), canActivate: [CanActivateRouteGuardService] },
  { path: 'ec-container', loadChildren: () => import('../pages/ec-container/ec-container.module').then(m => m.EcContainerPageModule), canActivate: [CanActivateRouteGuardService]},
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
