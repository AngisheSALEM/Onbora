from .models import DemoEvent

def log_demo_event(event_type, description, user=None, metadata=None):
    if metadata is None:
        metadata = {}
    try:
        DemoEvent.objects.create(
            event_type=event_type,
            description=description,
            user=user,
            metadata=metadata
        )
    except Exception as e:
        print(f"Error logging demo event: {e}")
