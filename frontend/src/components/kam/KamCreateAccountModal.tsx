"use client";

import React, { useState } from 'react';
import { StrategicVisit } from './kamTypes';
import { Icons } from '@/components/shared/Icons';

interface KamCreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAccount: (newVisit: StrategicVisit) => void;
}

export default function KamCreateAccountModal({
  isOpen,
  onClose,
  onAddAccount
}: KamCreateAccountModalProps) {
  const [accountName, setAccountName] = useState('');
  const [industry, setIndustry] = useState('Banque & Services Financiers');
  const [mrr, setMrr] = useState('');
  const [walletShare, setWalletShare] = useState('40');
  const [locationsCount, setLocationsCount] = useState('25');
  const [goldenRule, setGoldenRule] = useState('');
  const [meetingTime, setMeetingTime] = useState('14:30');
  const [meetingTitle, setMeetingTitle] = useState('Comité Stratégique Télécom & Cloud');
  const [businessSummary, setBusinessSummary] = useState('');
  
  // Primary contact
  const [contactName, setContactName] = useState('');
  const [contactTitle, setContactTitle] = useState('Directeur des Systèmes d\'Information (DSI)');
  const [contactRole, setContactRole] = useState<'CHAMPION' | 'ECONOMIC_BUYER' | 'TECHNICAL_BUYER'>('CHAMPION');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) return;

    const newId = `visit-${Date.now()}`;
    const parsedMrr = parseInt(mrr.replace(/\D/g, '')) || 25000;
    const parsedSites = parseInt(locationsCount) || 10;
    const parsedShare = parseInt(walletShare) || 35;

    const newVisit: StrategicVisit = {
      id: newId,
      account_id: `acc-${Date.now()}`,
      account_name: accountName,
      meeting_title: meetingTitle || 'Revue Stratégique Compte Clé',
      meeting_date: 'Aujourd\'hui',
      meeting_time: meetingTime || '14:30',
      duration_minutes: 45,
      is_prepared: true,
      preparation_time_minutes: 5,
      location: 'Siège Social Client — Salle du Conseil',
      status_label: 'Rendez-vous Confirmé',
      dot_color: 'blue',
      golden_rule: goldenRule || 'Écouter en priorité les contraintes d\'infrastructure avant toute proposition commerciale.',
      briefing: {
        account_id: `acc-${Date.now()}`,
        account_name: accountName,
        industry: industry,
        growth_stage: 'SCALING',
        firmographics: {
          headcount: 1200,
          estimated_annual_revenue: '75 M€',
          locations_count: parsedSites,
          countries: ['Côte d\'Ivoire'],
          business_model_summary: businessSummary || `${accountName} est un acteur stratégique en pleine expansion régionale.`
        },
        orange_relationship: {
          client_status: 'PARTIAL_CLIENT',
          wallet_share_percentage: parsedShare,
          mrr_current: parsedMrr,
          total_telecom_cloud_budget: Math.round(parsedMrr / (parsedShare / 100)),
          recent_incidents_count_30d: 0,
          critical_incidents_summary: 'Liaisons nominales. Aucun incident bloquant.',
          last_interactions_summary: [
            'Revue de compte trimestrielle satisfaisante.'
          ],
          active_contracts: [
            {
              service_name: 'Liaison Fibre Optique Dédiée & VPN',
              end_date: '2027-12-31',
              is_renewal_imminent: false,
              sla_status: 'HEALTHY',
              monthly_value: parsedMrr
            }
          ],
          open_commitments: [
            {
              id: `com-${Date.now()}`,
              action: 'Rapport de supervision et étude de raccordement',
              due_date: 'Sous 7 jours',
              owner: 'Ingénieur Avant-Vente',
              status: 'IN_PROGRESS'
            }
          ]
        },
        technical_environment: {
          current_competitors: ['MTN Business', 'Cisco'],
          installed_cloud_telecom_stack: ['Fibre Optique', 'Routeurs Cisco'],
          known_constraints: ['Continuité d\'activité 24/7 exigée'],
          cybersecurity_compliance_needs: ['Conformité UEMOA / Données souveraines']
        },
        stakeholders_mapping: [
          {
            id: `stk-${Date.now()}-1`,
            full_name: contactName || 'M. le Directeur des Systèmes d\'Information',
            job_title: contactTitle,
            role_in_decision: contactRole,
            stance_towards_orange: 'POSITIVE',
            influence_level: 'HIGH',
            key_notes: 'Ouvert à une modernisation vers le SD-WAN et le Cloud souverain.',
            last_contacted_date: 'Il y a 10 jours',
            last_contacted_by: 'Salem (KAM)'
          }
        ],
        missing_stakeholders_alert: [
          'La Direction des Achats n\'a pas encore été incluse dans la boucle de validation.'
        ],
        trigger_signals: [
          {
            id: `sig-${Date.now()}`,
            category: 'EXPANSION',
            title: `Projet de transformation numérique chez ${accountName}`,
            description: 'Recrutement IT détecté et modernisation des infrastructures.',
            date: 'Récemment',
            source: 'Annonce Web'
          }
        ],
        ai_hypotheses_and_playbook: {
          pain_hypotheses: [
            {
              hypothesis: 'Besoin de sécuriser et d\'interconnecter les nouvelles agences en haute disponibilité.',
              trigger_evidence: `Expansion prévue sur ${parsedSites} sites.`,
              discovery_angle: 'Quelle est votre tolérance de coupure sur vos agences régionales ?'
            }
          ],
          orange_opportunities: [
            {
              solution_category: 'SD-WAN & Cloud Souverain',
              value_proposition: 'Interconnexion résiliente multi-sites avec bascule automatique.',
              potential_mrr: 18000
            }
          ]
        },
        visit_strategy: {
          primary_objective: 'Positionner Orange Business comme le partenaire télécom & cloud de référence.',
          ideal_outcome: 'Obtenir l\'accord pour lancer un POC SD-WAN sur 5 sites pilotes.',
          suggested_agenda: [
            '1. Tour de table & vision stratégique (10 min)',
            '2. Bilan qualité des liens actifs (10 min)',
            '3. Présentation de la roadmap et opportunités (20 min)',
            '4. Définition des prochaines étapes et calendrier (5 min)'
          ],
          traps_to_avoid: [
            'Ne pas présenter de chiffrage financier avant d\'avoir validé le périmètre technique exact.'
          ]
        }
      }
    };

    onAddAccount(newVisit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#F6F5F2] dark:bg-[#2D2A2D] text-zinc-900 dark:text-white rounded-[32px] p-8 shadow-2xl border border-black/5 dark:border-white/5 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200/80 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
              <Icons.Building size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                Ajouter un Compte Stratégique
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Saisie manuelle ou import express d&apos;un compte client.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <Icons.Close size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-6 text-xs">
          
          {/* Row 1 : Nom + Secteur */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Nom de l&apos;Entreprise / Compte *
              </label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Ex: Banque Nationale d'Investissement (BNI)"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#191816] rounded-xl border border-zinc-200/80 dark:border-white/10 text-zinc-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Secteur d&apos;Activité
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#191816] rounded-xl border border-zinc-200/80 dark:border-white/10 text-zinc-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-600 outline-none"
              >
                <option value="Banque & Services Financiers">Banque & Services Financiers</option>
                <option value="Secteur Public & Gouvernement">Secteur Public & Gouvernement</option>
                <option value="Transport, Logistique & Industrie">Transport, Logistique & Industrie</option>
                <option value="Mines & Énergie">Mines & Énergie</option>
                <option value="Santé & Télécoms">Santé & Télécoms</option>
              </select>
            </div>
          </div>

          {/* Row 2 : MRR + Nombre de sites + Part de Marché */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                MRR Facturé (€ / m)
              </label>
              <input
                type="text"
                value={mrr}
                onChange={(e) => setMrr(e.target.value)}
                placeholder="Ex: 35000"
                className="w-full px-3 py-2 bg-white dark:bg-[#191816] rounded-xl border border-zinc-200/80 dark:border-white/10 text-zinc-900 dark:text-white font-mono font-bold outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Sites Connectés
              </label>
              <input
                type="number"
                value={locationsCount}
                onChange={(e) => setLocationsCount(e.target.value)}
                placeholder="25"
                className="w-full px-3 py-2 bg-white dark:bg-[#191816] rounded-xl border border-zinc-200/80 dark:border-white/10 text-zinc-900 dark:text-white font-mono font-bold outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Part Marché (%)
              </label>
              <input
                type="number"
                value={walletShare}
                onChange={(e) => setWalletShare(e.target.value)}
                placeholder="40"
                className="w-full px-3 py-2 bg-white dark:bg-[#191816] rounded-xl border border-zinc-200/80 dark:border-white/10 text-zinc-900 dark:text-white font-mono font-bold outline-none"
              />
            </div>
          </div>

          {/* Row 3 : Décideur Principal (MEDDIC) */}
          <div className="p-4 bg-[#ECEAE5] dark:bg-[#363336] rounded-2xl space-y-3">
            <span className="font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Icons.User size={15} className="text-[#4F6CE8]" />
              <span>Décideur Principal (MEDDIC)</span>
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-0.5">
                  Nom & Prénom
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ex: M. Jean-Marc Kouassi"
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#242124] rounded-lg text-zinc-900 dark:text-white font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-0.5">
                  Fonction
                </label>
                <input
                  type="text"
                  value={contactTitle}
                  onChange={(e) => setContactTitle(e.target.value)}
                  placeholder="Directeur IT / DSI"
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#242124] rounded-lg text-zinc-900 dark:text-white font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-0.5">
                  Rôle MEDDIC
                </label>
                <select
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#242124] rounded-lg text-zinc-900 dark:text-white font-medium outline-none"
                >
                  <option value="CHAMPION">Champion</option>
                  <option value="ECONOMIC_BUYER">Economic Buyer (DAF/DG)</option>
                  <option value="TECHNICAL_BUYER">Technical Buyer (RSSI/Infra)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 4 : Règle d'Or Tactique */}
          <div>
            <label className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              <Icons.Shield size={15} className="text-[#4F6CE8]" />
              <span>Règle d&apos;Or Avant d&apos;Entrer en Réunion</span>
            </label>
            <input
              type="text"
              value={goldenRule}
              onChange={(e) => setGoldenRule(e.target.value)}
              placeholder="Ex: Valider d'abord le bon fonctionnement de la liaison backup avant d'aborder l'extension."
              className="w-full px-4 py-2.5 bg-white dark:bg-[#242124] rounded-xl text-zinc-900 dark:text-white font-medium outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200/80 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-white/10 transition-all cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Icons.Plus size={16} />
              <span>Créer & Ouvrir le Compte</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
