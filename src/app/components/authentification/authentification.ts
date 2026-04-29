import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from "@angular/router";

@Component({
  selector: 'app-authentification',
  imports: [RouterLink],
  templateUrl: './authentification.html',
  styleUrl: './authentification.css',
})
export class Authentification {
  role="";
private route:ActivatedRoute=inject(ActivatedRoute);
private router:Router=inject(Router);
ngOnInit(){
  this.role=this.route.snapshot.params['role'];
  console.log('role =', this.role);

  if (!this.role) {
    this.router.navigate(['/Acceuil']);
  }
}
}
