import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth-service';

@Component({
  selector: 'app-inscrit-nutritionist',
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './inscrit-nutritionist.html',
  styleUrl: './inscrit-nutritionist.css',
})
export class InscritNutritionist {
  confirmPwd = '';
  agreed = false;

  formData = {
    nom: '',
    prenom: '',
    email: '',
    pwd: '',
    tel: '',
    specialite: '',
    localisation: '',
    typeAbonnement: '',
    role: 'NUTRITIONIST',
  };

  constructor(private authService: AuthService) {}

  register() {
    if (!this.agreed) {
      alert('Veuillez accepter les conditions.');
      return;
    }
    if (this.formData.pwd !== this.confirmPwd) {
      alert('Les mots de passe ne correspondent pas.');
      return;
    }
    this.authService.register(this.formData).subscribe({
      next: () => alert('Nutritionniste inscrit avec succès !'),
    });
  }
}