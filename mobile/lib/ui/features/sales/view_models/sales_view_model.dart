import 'package:flutter/material.dart';
import '../../../../data/models/enterprise_model.dart';
import '../../../../data/models/visit_prep_model.dart';
import '../../../../data/models/visit_report_model.dart';
import '../../../../data/repositories/sales_repository.dart';

class SalesViewModel extends ChangeNotifier {
  final SalesRepository _salesRepository;

  SalesViewModel({SalesRepository? salesRepository})
      : _salesRepository = salesRepository ?? SalesRepository();

  List<EnterpriseModel> _searchResults = [];
  List<EnterpriseModel> get searchResults => _searchResults;

  EnterpriseModel? _selectedEnterprise;
  EnterpriseModel? get selectedEnterprise => _selectedEnterprise;

  VisitPrepModel? _currentPrep;
  VisitPrepModel? get currentPrep => _currentPrep;

  VisitReportModel? _currentReport;
  VisitReportModel? get currentReport => _currentReport;

  bool _isSearching = false;
  bool get isSearching => _isSearching;

  bool _isCreatingPrep = false;
  bool get isCreatingPrep => _isCreatingPrep;

  bool _isGeneratingReport = false;
  bool get isGeneratingReport => _isGeneratingReport;

  bool _isTransmitting = false;
  bool get isTransmitting => _isTransmitting;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  String? _successMessage;
  String? get successMessage => _successMessage;

  Future<void> searchEnterprises(String query) async {
    if (query.trim().isEmpty) {
      _searchResults = [];
      notifyListeners();
      return;
    }

    _isSearching = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _searchResults = await _salesRepository.searchEnterprises(query);
    } catch (e) {
      _errorMessage = e.toString().replaceAll('ApiException: ', '');
    } finally {
      _isSearching = false;
      notifyListeners();
    }
  }

  void selectEnterprise(EnterpriseModel enterprise) {
    _selectedEnterprise = enterprise;
    _currentPrep = null;
    _currentReport = null;
    _errorMessage = null;
    _successMessage = null;
    notifyListeners();
  }

  Future<bool> prepareVisit() async {
    if (_selectedEnterprise == null) return false;

    _isCreatingPrep = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _currentPrep = await _salesRepository.createVisitPreparation(_selectedEnterprise!.id);
      _isCreatingPrep = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('ApiException: ', '');
      _isCreatingPrep = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> generateReportFromTranscript(String transcript, {String? audioPath}) async {
    if (_currentPrep == null) return false;

    _isGeneratingReport = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _currentReport = await _salesRepository.createVisitReport(
        preparationId: _currentPrep!.id,
        rawTranscript: transcript,
        audioFilePath: audioPath,
      );
      _isGeneratingReport = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('ApiException: ', '');
      _isGeneratingReport = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> transmitReportToKAM() async {
    if (_currentReport == null) return false;

    _isTransmitting = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _salesRepository.transmitToKAM(_currentReport!.id);
      _successMessage = res['detail'] ?? "Rapport transmis avec succès au KAM!";
      _isTransmitting = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('ApiException: ', '');
      _isTransmitting = false;
      notifyListeners();
      return false;
    }
  }

  void resetFlow() {
    _selectedEnterprise = null;
    _currentPrep = null;
    _currentReport = null;
    _searchResults = [];
    _errorMessage = null;
    _successMessage = null;
    notifyListeners();
  }
}
