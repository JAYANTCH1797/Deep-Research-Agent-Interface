import asyncio

class StreamingWriter:
    def __init__(self, callback):
        # callback should be an async function that takes a single timeline_update dict
        self.callback = callback
        # Track progress messages for phases when no callback is provided
        self.phase_history = {}

    async def send_update(self, phase: str, update_type: str, data: dict):
        """
        Send a timeline update based on update_type:
        - progress: status=in_progress, progress_message
        - completion: status=completed, details
        - error: status=error, progress_message + details.error
        Records progress messages in phase_history when callback is None.
        """
        # Build the timeline update envelope
        timeline_update = {"phase": phase}
        if update_type == "progress":
            timeline_update["status"] = "in_progress"
            timeline_update["progress_message"] = data.get("message", "")
            # Record history for progress
            self.phase_history.setdefault(phase, []).append(data.get("message", ""))
        elif update_type == "completion":
            timeline_update["status"] = "completed"
            timeline_update["details"] = data
        elif update_type == "error":
            timeline_update["status"] = "error"
            timeline_update["progress_message"] = data.get("message", "")
            timeline_update["details"] = {"error": data.get("message", "")}
        else:
            # Unknown update type; do nothing
            return

        # Forward to callback if provided
        if self.callback:
            try:
                result = self.callback(timeline_update)
                if asyncio.iscoroutine(result):
                    await result
            except Exception:
                # Swallow callback errors
                pass

async def stream_progress(phase: str, message: str, writer: StreamingWriter) -> None:
    """Stream a progress update through the writer."""
    await writer.send_update(phase=phase, update_type="progress", data={"message": message})

async def stream_completion(phase: str, details: dict, writer: StreamingWriter) -> None:
    """Stream a completion update through the writer."""
    await writer.send_update(phase=phase, update_type="completion", data=details)

async def stream_error(phase: str, error_message: str, writer: StreamingWriter) -> None:
    """Stream an error update through the writer."""
    await writer.send_update(phase=phase, update_type="error", data={"message": error_message}) 