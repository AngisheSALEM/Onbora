from reporting.application.use_cases import LogDemoEventUseCase


def log_demo_event(event_type, description, user=None, metadata=None):
    return LogDemoEventUseCase().execute((event_type, description, user, metadata))
