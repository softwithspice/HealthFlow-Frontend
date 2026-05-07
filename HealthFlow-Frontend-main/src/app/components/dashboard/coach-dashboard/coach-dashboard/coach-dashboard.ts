import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import {
  CoachAnalyticsItemDto,
  CoachConversationDto,
  CoachDashboardClientDto,
  CoachDashboardOverviewDto,
  CoachDashboardService,
  CoachExerciseDto,
  CoachIdentity,
  CoachNotificationDto,
  CoachWorkoutPlanSummaryDto,
} from '../../../services/coach-dashboard-service';
import { RendezVousService } from '../../../services/rendez-vous';
import { RendezVous } from '../../../../interfaces/rendez-vous';

type SubscriptionState = 'Active' | 'Expired';

interface SidebarItem {
  label: string;
  icon: string;
  active?: boolean;
  badgeCount?: number;
}

interface OverviewCard {
  label: string;
  value: string;
  helper: string;
  accent: 'green' | 'blue' | 'purple' | 'orange' | 'neutral';
}

interface WorkoutPlanItem {
  id: number;
  nom: string;
  dureeSemaines: number;
  seancesParSemaine: number;
  assignedClientsCount: number;
  exercisesCount: number;
}

interface ExerciseItem {
  id: number;
  nom: string;
  categorie: string;
  description: string;
  series?: number;
  repetitions?: number;
  poidsKg?: number;
}

interface ClientItem {
  id: string;
  name: string;
  email: string;
  assignedPlans: string[];
  progressStatus: string;
}

interface ConversationItem {
  id: number;
  clientName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}

interface AnalyticsItem {
  label: string;
  value: string;
  trend: string;
  fillPercent: number;
}

interface NotificationItem {
  id: number;
  text: string;
  type: string;
}

@Component({
  selector: 'app-coach-dashboard',
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './coach-dashboard.html',
  styleUrl: './coach-dashboard.css',
})
export class CoachDashboard implements OnInit {
  readonly coachName = 'Coach Samira';
  readonly coachRole = 'Performance Coach';
  readonly searchPlaceholder = 'Search clients, plans, exercises...';
  readonly apiErrorDefault = 'Error loading dashboard data.';

  subscription = {
    currentPlan: '3 months Pro',
    status: 'Active' as SubscriptionState,
    remainingDays: 42,
    expirationDate: '2026-06-12',
  };

  readonly sidebarItems: SidebarItem[] = [
    { label: 'Dashboard', icon: '🏠' },
    { label: 'Clients', icon: '🧑‍🤝‍🧑' },
    { label: 'Workout Plans', icon: '📋' },
    { label: 'Exercises', icon: '🏋️' },
    { label: 'Conversations', icon: '💬', badgeCount: 8 },
    { label: 'Subscription', icon: '💳' },
    { label: 'Profile', icon: '👤' },
  ];

  activeTab: string = 'Dashboard';

  workoutPlans: WorkoutPlanItem[] = [];

  exercises: ExerciseItem[] = [];

  clients: ClientItem[] = [];

  conversations: ConversationItem[] = [];

  analytics: AnalyticsItem[] = [];

  notifications: NotificationItem[] = [];
  isLoading = false;
  apiError = '';

  // Modal states
  showExerciseModal = false;
  showPlanModal = false;
  showClientDetailsModal = false;
  showPlanViewModal = false;
  showAssignmentModal = false;
  isEditingExercise = false;
  isEditingPlan = false;
  assignmentContext: 'client' | 'plan' = 'client';

  currentExercise: ExerciseItem | null = null;
  currentPlan: WorkoutPlanItem | null = null;
  selectedClient: ClientItem | null = null;
  selectedPlan: CoachWorkoutPlanSummaryDto | null = null;

  // Assignment selections
  targetAssignmentId: string | null = null; // Client ID or Plan ID (string for client UUID, number for plan)
  targetAssignmentPlanId: number | null = null; // Plan ID when context is 'plan'
  availableItemsForAssignment: any[] = [];
  assignmentSelectionId: string | number | null = null;

  // Coach identity cache
  coachIdentity: CoachIdentity | null = null;

  // Form data
  exerciseForm: Omit<CoachExerciseDto, 'id'> = {
    nom: '',
    description: '',
    series: null,
    repetitions: null,
    dureeSecondes: null,
    tempsReposSecondes: null,
    poidsKg: null,
    planExerciceId: null
  };

  planForm: Omit<CoachWorkoutPlanSummaryDto, 'id' | 'assignedClientsCount'> = {
    nom: '',
    description: '',
    dureeSemaines: 1,
    seancesParSemaine: 3,
    exercisesCount: 0,
    actif: true,
    dateDebut: new Date().toISOString().split('T')[0],
    exercices: []
  };

  // Selection for Plan Creation
  selectedExerciseIds: number[] = [];
  tempNewExercises: Omit<CoachExerciseDto, 'id'>[] = [];

  // New Exercise helper for Plan Modal
  newExInPlan: Omit<CoachExerciseDto, 'id'> = {
    nom: '',
    description: '',
    series: 3,
    repetitions: 10,
    dureeSecondes: null,
    tempsReposSecondes: null,
    poidsKg: null,
    planExerciceId: null
  };

  // ── RDV ───────────────────────────────────────────────────────────────────
  rdvEnAttente: RendezVous[] = [];
  rdvConfirmes: RendezVous[] = [];
  rdvRefuses: RendezVous[] = [];
  activeRdvTab: 'attente' | 'confirme' | 'refuse' = 'attente';
  rdvLoading = false;

  constructor(
    private readonly coachDashboardService: CoachDashboardService,
    private readonly route: ActivatedRoute,
    private readonly rdvService: RendezVousService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) { }

  ngOnInit(): void {
    const coachId = this.getCoachId();
    const coachEmail = this.getCoachEmail();
    const identity: CoachIdentity = { coachId, coachEmail };

    if (!identity.coachId && !identity.coachEmail) {
      this.apiError = 'Coach identity not found. Please log in again.';
      return;
    }

    this.coachIdentity = identity;
    this.loadDashboardData(identity);
    this.loadRdv();
  }

  private getCoachId(): string | undefined {
    if (isPlatformBrowser(this.platformId)) {
      return this.route.snapshot.queryParamMap.get('coachId') ??
        localStorage.getItem('userId') ??
        sessionStorage.getItem('userId') ??
        undefined;
    }
    return this.route.snapshot.queryParamMap.get('coachId') ?? undefined;
  }

  private getCoachEmail(): string | undefined {
    if (isPlatformBrowser(this.platformId)) {
      return this.route.snapshot.queryParamMap.get('coachEmail') ??
        localStorage.getItem('email') ??
        sessionStorage.getItem('email') ??
        this.extractEmailFromToken(localStorage.getItem('token')) ??
        this.extractEmailFromToken(sessionStorage.getItem('token')) ??
        undefined;
    }
    return this.route.snapshot.queryParamMap.get('coachEmail') ?? undefined;
  }

  get overviewCards(): OverviewCard[] {
    return [
      { label: 'Total Clients', value: String(this.clients.length), helper: 'Across active programs', accent: 'green' },
      { label: 'Active Workout Plans', value: String(this.workoutPlans.length), helper: 'Recently updated plans', accent: 'blue' },
      { label: 'Total Exercises', value: String(this.exercises.length), helper: 'Reusable exercise library', accent: 'purple' },
      { label: 'Unread Messages', value: String(this.totalUnreadMessages), helper: 'Needs your response', accent: 'orange' },
      { label: 'Subscription Status', value: this.subscription.status, helper: `${this.subscription.remainingDays} days remaining`, accent: 'neutral' },
    ];
  }

  get totalUnreadMessages(): number {
    return this.conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
  }

  // ── RDV METHODS ──────────────────────────────────────────────────────────

  loadRdv(): void {
    const coachId = Number(
      this.route.snapshot.queryParamMap.get('coachId') ??
      (isPlatformBrowser(this.platformId) ? localStorage.getItem('userId') : null) ??
      (isPlatformBrowser(this.platformId) ? sessionStorage.getItem('userId') : null) ??
      '2'
    );
    this.rdvLoading = true;
    this.rdvService.getByCoach(String(coachId)).subscribe({
      next: (data: RendezVous[]) => {
        this.rdvEnAttente = data.filter(r => r.statut === 'EN_ATTENTE');
        this.rdvConfirmes = data.filter(r => r.statut === 'CONFIRME');
        this.rdvRefuses = data.filter(r => r.statut === 'REFUSE');
        this.rdvLoading = false;
      },
      error: () => { this.rdvLoading = false; }
    });
  }

  accepterRdv(id: number): void {
    this.rdvService.accepter(id).subscribe(() => this.loadRdv());
  }

  refuserRdv(id: number): void {
    this.rdvService.refuser(id).subscribe(() => this.loadRdv());
  }

  setRdvTab(tab: 'attente' | 'confirme' | 'refuse'): void {
    this.activeRdvTab = tab;
  }

  get pendingRdvCount(): number {
    return this.rdvEnAttente.length;
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'Profile') {
      // In a real app, this might navigate to a separate route
      console.log('Navigating to Professional Profile...');
    }
  }

  // ── DASHBOARD DATA ────────────────────────────────────────────────────────

  private loadDashboardData(identity: CoachIdentity): void {
    this.isLoading = true;
    this.apiError = '';

    forkJoin({
      overview: this.coachDashboardService.getOverview(identity).pipe(catchError(err => {
        console.error('Error loading overview:', err);
        return of({ totalClients: 0, activeWorkoutPlans: 0, totalExercises: 0, unreadMessages: 0, subscriptionStatus: 'Active', subscriptionRemainingDays: 0 } as CoachDashboardOverviewDto);
      })),
      plans: this.coachDashboardService.getWorkoutPlans(identity).pipe(catchError(err => {
        console.error('Error loading plans:', err);
        return of([]);
      })),
      exercises: this.coachDashboardService.getExercises().pipe(catchError(err => {
        console.error('Error loading exercises:', err);
        return of([]);
      })),
      clients: this.coachDashboardService.getClients(identity).pipe(catchError(err => {
        console.error('Error loading clients:', err);
        return of([]);
      })),
      conversations: this.coachDashboardService.getConversations(identity).pipe(catchError(err => {
        console.error('Error loading conversations:', err);
        return of([]);
      })),
      analytics: this.coachDashboardService.getAnalytics(identity).pipe(catchError(err => {
        console.error('Error loading analytics:', err);
        return of([]);
      })),
      notifications: this.coachDashboardService.getNotifications(identity).pipe(catchError(err => {
        console.error('Error loading notifications:', err);
        return of([]);
      })),
    }).subscribe({
      next: (data) => {
        this.applyOverview(data.overview);
        this.workoutPlans = data.plans.map((plan) => this.mapPlan(plan));
        this.exercises = data.exercises.map((exercise) => this.mapExercise(exercise));
        this.clients = data.clients.map((client, index) => this.mapClient(client, index));
        this.conversations = data.conversations.map((chat) => this.mapConversation(chat));
        this.analytics = data.analytics.map((item) => this.mapAnalytics(item));
        this.notifications = data.notifications.map((notif, index) => this.mapNotification(notif, index + 1));
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.apiError = error?.error?.error ?? error?.message ?? this.apiErrorDefault;
      },
    });
  }

  // ── DETAIL MODALS ──────────────────────────────────────────────────────

  openClientDetails(client: ClientItem): void {
    this.selectedClient = client;
    this.showClientDetailsModal = true;
  }

  closeClientDetails(): void {
    this.showClientDetailsModal = false;
    this.selectedClient = null;
  }

  openPlanView(planId: number): void {
    this.coachDashboardService.getPlanById(planId).subscribe({
      next: (plan) => {
        this.selectedPlan = plan;
        this.showPlanViewModal = true;
      },
      error: (err: any) => console.error('Error fetching plan details:', err)
    });
  }

  closePlanView(): void {
    this.showPlanViewModal = false;
    this.selectedPlan = null;
  }

  // ── ACTIONS FROM MODALS ────────────────────────────────────────────────

  messageClient(client: ClientItem): void {
    this.setActiveTab('Conversations');
    this.closeClientDetails();
    console.log(`Messaging client: ${client.name}`);
  }

  duplicatePlan(plan: CoachWorkoutPlanSummaryDto): void {
    const duplicatedPlan: Omit<CoachWorkoutPlanSummaryDto, 'id' | 'assignedClientsCount'> = {
      nom: `${plan.nom} (Copy)`,
      description: plan.description,
      dureeSemaines: plan.dureeSemaines,
      seancesParSemaine: plan.seancesParSemaine,
      exercisesCount: plan.exercisesCount,
      actif: true,
      dateDebut: new Date().toISOString().split('T')[0],
      exercices: plan.exercices
        ? plan.exercices.map(ex => ({
          id: ex.id,
          nom: ex.nom,
          description: ex.description,
          series: ex.series,
          repetitions: ex.repetitions,
          dureeSecondes: ex.dureeSecondes,
          tempsReposSecondes: ex.tempsReposSecondes,
          poidsKg: ex.poidsKg,
          planExerciceId: ex.planExerciceId,
        }))
        : []
    };

    this.coachDashboardService.createPlan(duplicatedPlan).subscribe({
      next: (newPlan) => {
        this.workoutPlans.push(this.mapPlan(newPlan));
        this.closePlanView();
        alert('Plan duplicated successfully!');
      },
      error: (err: any) => console.error('Error duplicating plan:', err)
    });
  }

  openAddExerciseToPlan(plan: CoachWorkoutPlanSummaryDto): void {
    this.closePlanView();
    const planItem: WorkoutPlanItem = {
      id: plan.id,
      nom: plan.nom,
      dureeSemaines: plan.dureeSemaines,
      seancesParSemaine: plan.seancesParSemaine,
      assignedClientsCount: plan.assignedClientsCount ?? 0,
      exercisesCount: plan.exercisesCount ?? 0,
    };
    this.openEditPlanModal(planItem);
  }

  // ── ASSIGNMENT LOGIC ───────────────────────────────────────────────────

  openAssignPlanToClientModal(client: ClientItem): void {
    this.assignmentContext = 'client';
    this.targetAssignmentId = client.id;
    this.targetAssignmentPlanId = null;
    this.availableItemsForAssignment = this.workoutPlans;
    this.assignmentSelectionId = null;
    this.showAssignmentModal = true;
  }

  openAssignPlanToClientModalFromPlan(plan: { id: number }): void {
    this.assignmentContext = 'plan';
    this.targetAssignmentId = null;
    this.targetAssignmentPlanId = plan.id;
    this.availableItemsForAssignment = this.clients;
    this.assignmentSelectionId = null;
    this.showAssignmentModal = true;
  }

  closeAssignmentModal(): void {
    this.showAssignmentModal = false;
    this.targetAssignmentId = null;
    this.targetAssignmentPlanId = null;
    this.assignmentSelectionId = null;
  }

  confirmAssignment(): void {
    if (!this.coachIdentity) return;

    const coachId = this.coachIdentity.coachId;
    if (!coachId) {
      alert('Coach identity not found. Please log in again.');
      return;
    }

    let clientId: string | null = null;
    let planId: number | null = null;

    if (this.assignmentContext === 'client') {
      // targetAssignmentId = clientId, assignmentSelectionId = planId
      clientId = this.targetAssignmentId;
      planId = this.assignmentSelectionId as number;
    } else {
      // targetAssignmentPlanId = planId, assignmentSelectionId = clientId
      clientId = this.assignmentSelectionId as string;
      planId = this.targetAssignmentPlanId;
    }

    if (!clientId || !planId) {
      alert('Please select a ' + (this.assignmentContext === 'client' ? 'plan' : 'client') + ' to assign.');
      return;
    }

    this.coachDashboardService.assignPlanToClient({ coachId, clientId, planExerciceId: planId }).subscribe({
      next: () => {
        alert('Assignment successful!');
        this.closeAssignmentModal();
        this.closePlanView();
        this.closeClientDetails();
        this.loadDashboardData(this.coachIdentity!);
      },
      error: (err: any) => {
        const msg = err?.error?.message ?? err?.message ?? 'Failed to assign. Please try again.';
        alert(msg);
      }
    });
  }

  // ── PLAN CRUD ──────────────────────────────────────────────────────────

  openAddPlanModal(): void {
    this.isEditingPlan = false;
    this.currentPlan = null;
    this.selectedExerciseIds = [];
    this.tempNewExercises = [];
    this.planForm = {
      nom: '',
      description: '',
      dureeSemaines: 1,
      seancesParSemaine: 3,
      exercisesCount: 0,
      actif: true,
      dateDebut: new Date().toISOString().split('T')[0],
      exercices: []
    };
    this.showPlanModal = true;
  }

  openEditPlanModal(plan: WorkoutPlanItem): void {
    this.isEditingPlan = true;
    this.currentPlan = plan;
    // Pre-load exercises already linked to this plan
    this.coachDashboardService.getExercisesByPlan(plan.id).subscribe({
      next: (exList) => {
        this.selectedExerciseIds = exList.map(e => e.id);
      },
      error: () => { this.selectedExerciseIds = []; }
    });
    this.planForm = {
      nom: plan.nom,
      description: '',
      dureeSemaines: plan.dureeSemaines,
      seancesParSemaine: plan.seancesParSemaine,
      exercisesCount: plan.exercisesCount,
      actif: true,
      dateDebut: new Date().toISOString().split('T')[0],
      exercices: []
    };
    this.showPlanModal = true;
  }

  closePlanModal(): void {
    this.showPlanModal = false;
    this.currentPlan = null;
    this.isEditingPlan = false;
    this.selectedExerciseIds = [];
    this.tempNewExercises = [];
  }

  toggleExerciseSelection(id: number): void {
    const idx = this.selectedExerciseIds.indexOf(id);
    if (idx > -1) {
      this.selectedExerciseIds.splice(idx, 1);
    } else {
      this.selectedExerciseIds.push(id);
    }
  }

  addNewExerciseToTempPlan(): void {
    if (!this.newExInPlan.nom) return;
    this.tempNewExercises.push({ ...this.newExInPlan });
    this.newExInPlan = {
      nom: '',
      description: '',
      series: 3,
      repetitions: 10,
      dureeSecondes: null,
      tempsReposSecondes: null,
      poidsKg: null,
      planExerciceId: null
    };
  }

  removeTempExercise(index: number): void {
    this.tempNewExercises.splice(index, 1);
  }

  savePlan(): void {
    if (this.selectedExerciseIds.length === 0) {
      alert('Please select at least one exercise.');
      return;
    }

    // Build exercices list with full id field matching ExerciceDto on backend
    const exercicesForPlan = this.selectedExerciseIds.map(id => ({
      id,
      nom: '',
      description: '',
      series: null,
      repetitions: null,
      dureeSecondes: null,
      tempsReposSecondes: null,
      poidsKg: null,
      planExerciceId: null,
    }));

    this.planForm.exercices = exercicesForPlan;

    if (this.isEditingPlan && this.currentPlan) {
      this.coachDashboardService.updatePlan(this.currentPlan.id, this.planForm).subscribe({
        next: (updatedPlan) => {
          const index = this.workoutPlans.findIndex(p => p.id === updatedPlan.id);
          if (index !== -1) {
            this.workoutPlans[index] = this.mapPlan(updatedPlan);
          }
          this.closePlanModal();
        },
        error: (err: any) => console.error('Error updating plan:', err)
      });
    } else {
      this.coachDashboardService.createPlan(this.planForm).subscribe({
        next: (newPlan) => {
          this.workoutPlans.push(this.mapPlan(newPlan));
          this.closePlanModal();
        },
        error: (err: any) => console.error('Error creating plan:', err)
      });
    }
  }

  deletePlan(plan: WorkoutPlanItem): void {
    if (confirm(`Are you sure you want to delete the plan "${plan.nom}"?`)) {
      this.coachDashboardService.deletePlan(plan.id).subscribe({
        next: () => {
          this.workoutPlans = this.workoutPlans.filter(p => p.id !== plan.id);
        },
        error: (err: any) => console.error('Error deleting plan:', err)
      });
    }
  }

  // ── EXERCISE CRUD ──────────────────────────────────────────────────────

  openAddExerciseModal(): void {
    this.isEditingExercise = false;
    this.currentExercise = null;
    this.exerciseForm = {
      nom: '',
      description: '',
      series: null,
      repetitions: null,
      dureeSecondes: null,
      tempsReposSecondes: null,
      poidsKg: null,
      planExerciceId: null
    };
    this.showExerciseModal = true;
  }

  openEditExerciseModal(exercise: ExerciseItem): void {
    this.isEditingExercise = true;
    // On doit retrouver l'exercice complet pour le formulaire car ExerciseItem est simplifié
    this.coachDashboardService.getExerciseById(exercise.id).subscribe({
      next: (fullEx) => {
        this.currentExercise = this.mapExercise(fullEx);
        this.exerciseForm = {
          nom: fullEx.nom,
          description: fullEx.description,
          series: fullEx.series,
          repetitions: fullEx.repetitions,
          dureeSecondes: fullEx.dureeSecondes,
          tempsReposSecondes: fullEx.tempsReposSecondes,
          poidsKg: fullEx.poidsKg,
          planExerciceId: fullEx.planExerciceId
        };
        this.showExerciseModal = true;
      },
      error: (err: any) => console.error('Error fetching exercise details:', err)
    });
  }

  closeExerciseModal(): void {
    this.showExerciseModal = false;
    this.currentExercise = null;
    this.isEditingExercise = false;
  }

  saveExercise(): void {
    if (this.isEditingExercise && this.currentExercise) {
      this.coachDashboardService.updateExercise(this.currentExercise.id, this.exerciseForm).subscribe({
        next: (updatedEx) => {
          const index = this.exercises.findIndex(e => e.id === updatedEx.id);
          if (index !== -1) {
            this.exercises[index] = this.mapExercise(updatedEx);
          }
          this.closeExerciseModal();
        },
        error: (err: any) => console.error('Error updating exercise:', err)
      });
    } else {
      this.coachDashboardService.createExercise(this.exerciseForm).subscribe({
        next: (newEx) => {
          this.exercises.push(this.mapExercise(newEx));
          this.closeExerciseModal();
        },
        error: (err: any) => console.error('Error creating exercise:', err)
      });
    }
  }

  deleteExercise(exercise: ExerciseItem): void {
    if (confirm(`Are you sure you want to delete the exercise "${exercise.nom}"?`)) {
      this.coachDashboardService.deleteExercise(exercise.id).subscribe({
        next: () => {
          this.exercises = this.exercises.filter(e => e.id !== exercise.id);
        },
        error: (err: any) => console.error('Error deleting exercise:', err)
      });
    }
  }

  private applyOverview(overview: CoachDashboardOverviewDto): void {
    this.subscription.status = overview.subscriptionStatus === 'Active' ? 'Active' : 'Expired';
    this.subscription.remainingDays = overview.subscriptionRemainingDays;
  }

  private mapPlan(plan: CoachWorkoutPlanSummaryDto): WorkoutPlanItem {
    return {
      id: plan.id,
      nom: plan.nom,
      dureeSemaines: plan.dureeSemaines,
      seancesParSemaine: plan.seancesParSemaine,
      assignedClientsCount: plan.assignedClientsCount || 0,
      exercisesCount: plan.exercisesCount || plan.exercices?.length || 0,
    };
  }

  private mapExercise(exercise: CoachExerciseDto): ExerciseItem {
    return {
      id: exercise.id,
      nom: exercise.nom,
      categorie: this.detectExerciseCategory(exercise),
      description: exercise.description || 'No description',
    };
  }

  private mapClient(client: CoachDashboardClientDto, index: number): ClientItem {
    return {
      id: client.id,
      name: client.name,
      email: client.email,
      assignedPlans: client.assignedPlans ?? [],
      progressStatus: client.progressStatus,
    };
  }

  private mapConversation(chat: CoachConversationDto): ConversationItem {
    return {
      id: chat.id,
      clientName: chat.clientName,
      lastMessage: chat.lastMessagePreview || 'No messages yet',
      timestamp: this.formatDate(chat.lastMessageAt),
      unreadCount: chat.unreadCount,
    };
  }

  private mapAnalytics(item: CoachAnalyticsItemDto): AnalyticsItem {
    return {
      label: item.label,
      value: item.value,
      trend: item.trend,
      fillPercent: item.fillPercent,
    };
  }

  private mapNotification(notification: CoachNotificationDto, id: number): NotificationItem {
    return { id, text: notification.text, type: notification.type };
  }

  private formatDate(dateValue: string | null): string {
    if (!dateValue) {
      return 'No activity';
    }
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) {
      return dateValue;
    }
    return d.toLocaleString([], {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private detectExerciseCategory(exercise: CoachExerciseDto): string {
    if ((exercise.dureeSecondes ?? 0) >= 120) {
      return 'Cardio';
    }
    if ((exercise.series ?? 0) >= 3) {
      return 'Strength';
    }
    return 'General';
  }

  private extractEmailFromToken(token: string | null): string | undefined {
    if (!token) {
      return undefined;
    }

    const parts = token.split('.');
    if (parts.length < 2) {
      return undefined;
    }

    try {
      const payloadJson = atob(parts[1]);
      const payload = JSON.parse(payloadJson) as { sub?: string; email?: string };
      return payload.sub ?? payload.email;
    } catch {
      return undefined;
    }
  }
}
