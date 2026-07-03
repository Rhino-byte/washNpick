"""Order status transitions for staff."""

from fastapi import HTTPException, status

from app.models.enums import OrderStatus

OPS_FLOW: list[OrderStatus] = [
    OrderStatus.pending_pickup,
    OrderStatus.collected,
    OrderStatus.in_progress,
    OrderStatus.ready,
    OrderStatus.out_for_delivery,
    OrderStatus.delivered,
]


def validate_status_transition(current: OrderStatus, new: OrderStatus) -> None:
    if current == new:
        return

    if current in OPS_FLOW and new in OPS_FLOW:
        current_idx = OPS_FLOW.index(current)
        new_idx = OPS_FLOW.index(new)
        if new_idx < current_idx:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot move status backward from {current.value} to {new.value}",
            )
        return

    if new == OrderStatus.cancelled:
        return

    if current in (
        OrderStatus.pending_payment,
        OrderStatus.pending_deposit,
        OrderStatus.confirmed,
    ) and new == OrderStatus.pending_pickup:
        return

    if current not in OPS_FLOW and new in OPS_FLOW:
        return


def next_ops_status(current: OrderStatus) -> OrderStatus | None:
    if current not in OPS_FLOW:
        return OrderStatus.pending_pickup
    idx = OPS_FLOW.index(current)
    if idx >= len(OPS_FLOW) - 1:
        return None
    return OPS_FLOW[idx + 1]
