import { Routes } from '@angular/router';
import { Acceuil } from './components/acceuil/acceuil';
import { Authentification } from './components/authentification/authentification';
<<<<<<< HEAD
import { InscritNutritionist } from './components/inscrit-nutritionist/inscrit-nutritionist';
import { InscritCoach } from './components/inscrit-coach/inscrit-coach';
import { InscritBloomer } from './components/inscrit-bloomer/inscrit-bloomer';
=======
import { InscritNutritionist } from './components/inscrit/inscrit-nutritionist/inscrit-nutritionist';
import { InscritCoach } from './components/inscrit/inscrit-coach/inscrit-coach';
import { InscritBloomer } from './components/inscrit/inscrit-bloomer/inscrit-bloomer';

>>>>>>> 7d51e85d931d9be534ee41817055b31af3683d78

export const routes: Routes = [
    {path:"Acceuil",title:"Acceuil",component:Acceuil},
    {path:"authentification/:role",title:"authentification",component:Authentification},
    {
        path:"inscrire/nutritionist",component:InscritNutritionist
    },
      {
        path:"inscrire/coach",component:InscritCoach
    },  {
<<<<<<< HEAD
        path:"inscrire/bloomer",component:InscritBloomer 
=======
        path:"inscrire/bloomer",component:InscritBloomer
>>>>>>> 7d51e85d931d9be534ee41817055b31af3683d78
    },
    {path:'' ,redirectTo:"Acceuil",pathMatch:'full'

    }
];
