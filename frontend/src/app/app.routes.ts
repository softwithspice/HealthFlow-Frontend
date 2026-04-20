import { Routes } from '@angular/router';
import { Acceuil } from './components/acceuil/acceuil';
import { Authentification } from './components/authentification/authentification';
import { InscritNutritionist } from './components/inscrit-nutritionist/inscrit-nutritionist';
import { InscritCoach } from './components/inscrit-coach/inscrit-coach';
import { InscritBloomer } from './components/inscrit-bloomer/inscrit-bloomer';

export const routes: Routes = [
    {path:"Acceuil",title:"Acceuil",component:Acceuil},
    {path:"authentification/:role",title:"authentification",component:Authentification},
    {
        path:"inscrire/nutritionist",component:InscritNutritionist
    },
      {
        path:"inscrire/coach",component:InscritCoach
    },  {
        path:"inscrire/bloomer",component:InscritBloomer 
    },
    {path:'' ,redirectTo:"Acceuil",pathMatch:'full'

    }
];
