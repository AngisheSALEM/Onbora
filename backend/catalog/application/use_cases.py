from typing import List, Optional, Any, Dict, Tuple
from catalog.models import ServiceCatalog
from catalog.domain.exceptions import ServiceNotFoundException
from catalog.application.dtos import (
    ServiceCatalogDTO,
    CreateServiceDTO,
    UpdateServiceDTO,
    CatalogUploadResultDTO,
)
from shared.application.use_case import BaseUseCase


def _to_dto(service: ServiceCatalog) -> ServiceCatalogDTO:
    return ServiceCatalogDTO(
        id=service.id,
        name=service.name,
        category=service.category,
        description=service.description,
        benefits=service.benefits,
        technical_requirements=service.technical_requirements or {},
    )


class ListServicesUseCase(BaseUseCase[Any, List[ServiceCatalogDTO]]):
    def execute(self, request: Any = None) -> List[ServiceCatalogDTO]:
        services = ServiceCatalog.objects.all().order_by('id')
        return [_to_dto(s) for s in services]


class GetServiceDetailUseCase(BaseUseCase[int, ServiceCatalogDTO]):
    def execute(self, service_id: int) -> ServiceCatalogDTO:
        try:
            service = ServiceCatalog.objects.get(pk=service_id)
            return _to_dto(service)
        except ServiceCatalog.DoesNotExist:
            raise ServiceNotFoundException(service_id)


class CreateServiceUseCase(BaseUseCase[CreateServiceDTO, ServiceCatalogDTO]):
    def execute(self, dto: CreateServiceDTO) -> ServiceCatalogDTO:
        service = ServiceCatalog.objects.create(
            name=dto.name,
            category=dto.category,
            description=dto.description,
            benefits=dto.benefits,
            technical_requirements=dto.technical_requirements,
        )
        return _to_dto(service)


class UpdateServiceUseCase(BaseUseCase[Tuple[int, UpdateServiceDTO], ServiceCatalogDTO]):
    def execute(self, params: Tuple[int, UpdateServiceDTO]) -> ServiceCatalogDTO:
        service_id, dto = params
        try:
            service = ServiceCatalog.objects.get(pk=service_id)
        except ServiceCatalog.DoesNotExist:
            raise ServiceNotFoundException(service_id)

        if dto.name is not None:
            service.name = dto.name
        if dto.category is not None:
            service.category = dto.category
        if dto.description is not None:
            service.description = dto.description
        if dto.benefits is not None:
            service.benefits = dto.benefits
        if dto.technical_requirements is not None:
            service.technical_requirements = dto.technical_requirements

        service.save()
        return _to_dto(service)


class DeleteServiceUseCase(BaseUseCase[int, bool]):
    def execute(self, service_id: int) -> bool:
        try:
            service = ServiceCatalog.objects.get(pk=service_id)
            service.delete()
            return True
        except ServiceCatalog.DoesNotExist:
            raise ServiceNotFoundException(service_id)


class UploadCatalogUseCase(BaseUseCase[Tuple[str, Any], CatalogUploadResultDTO]):
    def execute(self, params: Tuple[str, Any]) -> CatalogUploadResultDTO:
        filename, uploaded_file = params
        from catalog.parser import (
            extract_text_from_pdf,
            extract_text_from_docx,
            parse_catalog_text,
            extract_simulated_services,
        )

        file_type = 'unknown'
        if filename.endswith('.pdf'):
            file_type = 'pdf'
        elif filename.endswith('.docx'):
            file_type = 'docx'
        elif filename.endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff')):
            file_type = 'image'
        elif filename.endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv')):
            file_type = 'video'

        extracted_text = ""
        services = []

        if file_type == 'pdf':
            extracted_text = extract_text_from_pdf(uploaded_file)
            services = parse_catalog_text(extracted_text)
        elif file_type == 'docx':
            extracted_text = extract_text_from_docx(uploaded_file)
            services = parse_catalog_text(extracted_text)

        if not services:
            services = extract_simulated_services(filename, file_type)

        return CatalogUploadResultDTO(
            filename=filename,
            file_type=file_type,
            services_found_count=len(services),
            services=services,
        )
