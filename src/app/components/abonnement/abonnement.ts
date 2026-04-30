import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-abonnement',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './abonnement.html',
  styleUrl: './abonnement.css',
})
export class Abonnement implements OnInit {

  selectedPlan = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  paymentData = {
    nomCarte: '',
    numeroCarte: '',
    dateExpiration: '',
    cvv: '',
    typeAbonnement: ''
  };

  plans = [
    { id: 'MOIS_1', label: '1 MONTH',  total: 300,  perMonth: 300 },
    { id: 'MOIS_3', label: '3 MONTHS', total: 750,  perMonth: 250 },
    { id: 'MOIS_6', label: '6 MONTHS', total: 1320, perMonth: 220 },
    { id: 'AN_1',   label: '1 YEAR ⭐', total: 2160, perMonth: 180 },
  ];

  private registerData: any = null;
  private apiUrl = 'http://localhost:8084/api';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    const saved = sessionStorage.getItem('register_data');
    if (!saved) {
      this.router.navigate(['/inscrire/nutritionist']);
      return;
    }
    this.registerData = JSON.parse(saved);
  }

  selectPlan(planId: string): void {
    this.selectedPlan = planId;
    this.paymentData.typeAbonnement = planId;
  }

  formatCardNumber(event: any): void {
    let val = event.target.value.replace(/\D/g, '').slice(0, 16);
    val = val.replace(/(.{4})/g, '$1 ').trim();
    this.paymentData.numeroCarte = val;
    event.target.value = val;
  }

  formatExpiry(event: any): void {
    let val = event.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2);
    this.paymentData.dateExpiration = val;
    event.target.value = val;
  }

  formatCvv(event: any): void {
    let val = event.target.value.replace(/\D/g, '').slice(0, 3);
    this.paymentData.cvv = val;
    event.target.value = val;
  }

  isFormValid(): boolean {
    return !!this.selectedPlan &&
      !!this.paymentData.nomCarte.trim() &&
      this.paymentData.numeroCarte.replace(/\s/g, '').length === 16 &&
      this.paymentData.dateExpiration.length === 5 &&
      this.paymentData.cvv.length === 3;
  }

  subscribe(): void {
    if (!this.isFormValid()) {
      this.errorMessage = 'Veuillez remplir tous les champs correctement.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // ── Step 1: Register → reçoit le token directement ──────────
    const registerPayload = { ...this.registerData, typeAbonnement: this.selectedPlan };

    this.http.post<any>(`${this.apiUrl}/auth/register`, registerPayload).subscribe({
      next: (registerResponse) => {
        // ✅ Le register retourne déjà le token — pas besoin de login séparé
        const token = registerResponse.token;

        if (!token) {
          this.loading = false;
          this.errorMessage = 'Inscription réussie mais token manquant.';
          return;
        }

        // Sauvegarder le token
        localStorage.setItem('token', token);
        localStorage.setItem('role', registerResponse.role);

        // ── Step 2: Payer avec le token ──────────────────────────
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        const paymentPayload = {
          nomCarte: this.paymentData.nomCarte,
          numeroCarte: this.paymentData.numeroCarte.replace(/\s/g, ''),
          dateExpiration: this.paymentData.dateExpiration,
          cvv: this.paymentData.cvv,
          typeAbonnement: this.selectedPlan
        };

        this.http.post<any>(`${this.apiUrl}/abonnements/payer`, paymentPayload, { headers }).subscribe({
          next: () => {
            this.loading = false;
            this.successMessage = '✅ Subscription activated! Redirecting...';
            sessionStorage.removeItem('register_data');
            setTimeout(() => this.router.navigate(['/dashboard/nutritionist']), 1500);
          },
          error: (err) => {
            this.loading = false;
            this.errorMessage = err.error?.error || err.error?.message || 'Payment failed. Please try again.';
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || err.error?.error || 'Registration failed. Please try again.';
      }
    });
  }
}