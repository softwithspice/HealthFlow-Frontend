import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth-service';

@Component({
  selector: 'app-inscrit-bloomer',
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './inscrit-bloomer.html',
  styleUrl: './inscrit-bloomer.css',
})
export class InscritBloomer {
  confirmPwd = '';
  agreed = false;

  formData = {
    nom: '',
    prenom: '',
    email: '',
    pwd: '',
    tel: '',
    age: null as number | null,
    height: null as number | null,
    weight: null as number | null,
    goal: '',
    lifestyleLevel: '',
    role: 'BLOOMER',
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
      next: () => alert('Bloomer inscrit avec succès !'),
    });
  }
}