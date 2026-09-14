import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/sales_controller.dart';
import '../model/plaque_model.dart';
import '../model/enterprise_model.dart';
import '../../../routes/app_routes.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/aurora_background.dart';
import '../../../common/screen/widget/scale_tap.dart';
import 'widget/credit_risk_badge.dart';

/// Écran Détail d'une Plaque Assignée au Commercial
/// Affiche la liste des comptes SOHO de cette plaque avec lancement direct du formulaire de visite
class PlaqueDetailScreen extends StatefulWidget {
  const PlaqueDetailScreen({super.key});

  @override
  State<PlaqueDetailScreen> createState() => _PlaqueDetailScreenState();
}

class _PlaqueDetailScreenState extends State<PlaqueDetailScreen> {
  final SalesController salesController = Get.find<SalesController>();
  final TextEditingController _searchController = TextEditingController();

  PlaqueModel? _plaque;
  List<EnterpriseModel> _allPlaqueEnterprises = [];
  List<EnterpriseModel> _filteredEnterprises = [];
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _plaque = Get.arguments as PlaqueModel?;
    _loadEnterprises();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadEnterprises() async {
    setState(() => _isLoading = true);

    if (_plaque != null) {
      final list = await salesController.fetchEnterprisesForPlaque(_plaque!.id);
      if (mounted) {
        setState(() {
          _allPlaqueEnterprises = list;
          _applySearch();
          _isLoading = false;
        });
      }
    } else {
      // Fallback si pas d'argument : première plaque assignée
      if (salesController.myAssignedPlaques.isNotEmpty) {
        _plaque = salesController.myAssignedPlaques.first;
        final list = await salesController.fetchEnterprisesForPlaque(_plaque!.id);
        if (mounted) {
          setState(() {
            _allPlaqueEnterprises = list;
            _applySearch();
            _isLoading = false;
          });
        }
      } else {
        setState(() => _isLoading = false);
      }
    }
  }

  void _applySearch() {
    final q = _searchQuery.trim().toLowerCase();
    if (q.isEmpty) {
      _filteredEnterprises = List.from(_allPlaqueEnterprises);
    } else {
      _filteredEnterprises = _allPlaqueEnterprises.where((e) {
        return e.name.toLowerCase().contains(q) ||
            (e.sector?.toLowerCase().contains(q) ?? false) ||
            (e.location?.toLowerCase().contains(q) ?? false) ||
            (e.address?.toLowerCase().contains(q) ?? false) ||
            (e.contactName?.toLowerCase().contains(q) ?? false);
      }).toList();
    }
  }

  void _onSearchChanged(String query) {
    setState(() {
      _searchQuery = query;
      _applySearch();
    });
  }

  void _startVisit(EnterpriseModel ent) {
    salesController.selectEnterprise(ent);
    Get.toNamed(Routes.VISIT_FORM);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final plaque = _plaque;

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: Icon(
            CupertinoIcons.chevron_back,
            color: isDark ? Colors.white : AppConstants.textDark,
            size: 22,
          ),
          tooltip: 'Retour',
          onPressed: () => Get.back(),
        ),
        actions: [
          IconButton(
            icon: Icon(
              CupertinoIcons.arrow_clockwise,
              color: isDark ? Colors.white70 : AppConstants.textDark,
              size: 20,
            ),
            tooltip: 'Actualiser',
            onPressed: _loadEnterprises,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: AuroraBackground(
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. En-tête de la Plaque
              Padding(
                padding: const EdgeInsets.fromLTRB(AppConstants.paddingLg, 4, AppConstants.paddingLg, 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Badge Code Plaque & Statut
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isDark ? const Color(0x33FFFFFF) : const Color(0x15000000),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(CupertinoIcons.location_solid, size: 12, color: isDark ? Colors.white70 : AppConstants.primaryBlack),
                              const SizedBox(width: 5),
                              Text(
                                plaque?.code ?? 'PLAQUE',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.5,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppConstants.successGreen.withValues(alpha: isDark ? 0.2 : 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Assignée à vous',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppConstants.successGreen,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Nom complet de la Plaque
                    Text(
                      plaque?.name ?? 'Détail de la plaque',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.4,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                    const SizedBox(height: 3),

                    // Ville & Métadonnées
                    Text(
                      '${plaque?.city ?? 'Kinshasa'} • Rayon ~${plaque?.radiusKm.toStringAsFixed(1) ?? '5.0'} km',
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                      ),
                    ),
                  ],
                ),
              ),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg),
                child: Divider(
                  height: 16,
                  thickness: 0.5,
                  color: isDark ? const Color(0x22FFFFFF) : const Color(0x15000000),
                ),
              ),

              // 2. Barre de Recherche intégrée à la plaque
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 4),
                child: Container(
                  height: 40,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E1E22) : const Color(0xFFF2F2F7),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark ? const Color(0x22FFFFFF) : const Color(0x12000000),
                    ),
                  ),
                  child: Row(
                    children: [
                      const SizedBox(width: 10),
                      Icon(
                        CupertinoIcons.search,
                        size: 16,
                        color: isDark ? Colors.white54 : const Color(0xFF8E8E93),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          onChanged: _onSearchChanged,
                          style: TextStyle(
                            fontSize: 14,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                          decoration: InputDecoration(
                            hintText: 'Filtrer les comptes de cette plaque...',
                            hintStyle: TextStyle(
                              fontSize: 13,
                              color: isDark ? const Color(0xFF71717A) : const Color(0xFF9CA3AF),
                            ),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ),
                      if (_searchQuery.isNotEmpty)
                        IconButton(
                          icon: const Icon(CupertinoIcons.clear_circled_solid, size: 16),
                          color: isDark ? Colors.white54 : const Color(0xFF8E8E93),
                          onPressed: () {
                            _searchController.clear();
                            _onSearchChanged('');
                          },
                        ),
                    ],
                  ),
                ),
              ),

              // 3. Compteur d'entreprises
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 6),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'COMPTES DISPONIBLES (${_filteredEnterprises.length})',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6,
                        color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                      ),
                    ),
                  ],
                ),
              ),

              // 4. Liste des Entreprises
              Expanded(
                child: _isLoading
                    ? const Center(child: CupertinoActivityIndicator(radius: 14))
                    : _filteredEnterprises.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    CupertinoIcons.building_2_fill,
                                    size: 40,
                                    color: isDark ? Colors.white24 : Colors.black26,
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    _searchQuery.isNotEmpty
                                        ? 'Aucun compte correspondant à "$_searchQuery"'
                                        : 'Aucune entreprise répertoriée sur cette plaque',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                      color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.separated(
                            physics: const BouncingScrollPhysics(),
                            padding: const EdgeInsets.fromLTRB(
                              AppConstants.paddingLg,
                              4,
                              AppConstants.paddingLg,
                              32,
                            ),
                            itemCount: _filteredEnterprises.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final ent = _filteredEnterprises[index];
                              return _buildEnterpriseCard(ent, isDark);
                            },
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEnterpriseCard(EnterpriseModel ent, bool isDark) {
    return ScaleTap(
      onTap: () => _startVisit(ent),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ligne 1 : Secteur + Badges
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    (ent.sector ?? 'PROSPECT B2B').toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                      color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                CreditRiskBadge(rating: ent.creditRating, compact: true),
              ],
            ),
            const SizedBox(height: 6),

            // Ligne 2 : Nom de l'entreprise
            Text(
              ent.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.3,
                color: isDark ? Colors.white : AppConstants.textDark,
              ),
            ),
            const SizedBox(height: 3),

            // Ligne 3 : Adresse / Localisation
            Text(
              (ent.address?.isNotEmpty == true)
                  ? ent.address!
                  : (ent.location ?? 'Kinshasa, RDC'),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12.5,
                color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
              ),
            ),
            const SizedBox(height: 12),

            // Ligne 4 : Statut & Bouton Action "Lancer la visite"
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Statut de visite
                if (ent.isVisited)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppConstants.successGreen.withValues(alpha: isDark ? 0.2 : 0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(CupertinoIcons.checkmark_alt, size: 12, color: AppConstants.successGreen),
                        const SizedBox(width: 4),
                        Text(
                          'Déjà visité',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppConstants.successGreen,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'À prospecter',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF71717A),
                      ),
                    ),
                  ),

                // Bouton CTA "Lancer la visite"
                ScaleTap(
                  onTap: () => _startVisit(ent),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFF1C1C1E),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Text(
                          'Lancer la visite',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(width: 6),
                        Icon(
                          CupertinoIcons.arrow_right,
                          size: 12,
                          color: Colors.white,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
