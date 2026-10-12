"""email otp login

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-12 21:46:13.566212
"""
from alembic import op
import sqlalchemy as sa


revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('email_otps',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('email', sa.String(length=320), nullable=False),
    sa.Column('code_hash', sa.String(length=64), nullable=False),
    sa.Column('attempts', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('consumed_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('email_otps', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_email_otps_created_at'), ['created_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_email_otps_email'), ['email'], unique=False)

    # Email is the login identity: normalize to lowercase, then make it unique
    op.execute("UPDATE users SET email = lower(email) WHERE email IS NOT NULL")
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('email_verified_at', sa.DateTime(), nullable=True))
        batch_op.create_unique_constraint('uq_users_email', ['email'])



def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('uq_users_email', type_='unique')
        batch_op.drop_column('email_verified_at')

    with op.batch_alter_table('email_otps', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_email_otps_email'))
        batch_op.drop_index(batch_op.f('ix_email_otps_created_at'))

    op.drop_table('email_otps')
