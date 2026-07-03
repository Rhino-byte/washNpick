"""GPS-first location: require lat/lng, optional landmark

Revision ID: 002_location_gps
Revises: 001_initial
Create Date: 2026-07-03
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_location_gps"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_LAT = -0.75
DEFAULT_LNG = 35.25
DEFAULT_AREA = "Ololulunga"


def _backfill_address_table(table: str) -> None:
    op.execute(
        sa.text(
            f"UPDATE {table} SET area = :area WHERE area IS NULL OR area = ''"
        ).bindparams(area=DEFAULT_AREA)
    )
    op.execute(
        sa.text(
            f"UPDATE {table} SET latitude = :lat WHERE latitude IS NULL"
        ).bindparams(lat=DEFAULT_LAT)
    )
    op.execute(
        sa.text(
            f"UPDATE {table} SET longitude = :lng WHERE longitude IS NULL"
        ).bindparams(lng=DEFAULT_LNG)
    )


def upgrade() -> None:
    for table in ("user_addresses", "order_addresses"):
        _backfill_address_table(table)

        op.alter_column(table, "area", existing_type=sa.String(100), nullable=True)
        op.alter_column(table, "address_line", existing_type=sa.Text(), nullable=True)
        op.alter_column(
            table,
            "latitude",
            existing_type=sa.Numeric(10, 7),
            nullable=False,
        )
        op.alter_column(
            table,
            "longitude",
            existing_type=sa.Numeric(10, 7),
            nullable=False,
        )


def downgrade() -> None:
    for table in ("user_addresses", "order_addresses"):
        op.alter_column(
            table,
            "longitude",
            existing_type=sa.Numeric(10, 7),
            nullable=True,
        )
        op.alter_column(
            table,
            "latitude",
            existing_type=sa.Numeric(10, 7),
            nullable=True,
        )
        op.alter_column(table, "address_line", existing_type=sa.Text(), nullable=False)
        op.alter_column(table, "area", existing_type=sa.String(100), nullable=False)
