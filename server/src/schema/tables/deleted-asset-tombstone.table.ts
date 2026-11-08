import { Column, CreateDateColumn, ForeignKeyColumn, Index, Table, Timestamp, type Generated } from '@immich/sql-tools';
import { PrimaryGeneratedUuidV7Column } from 'src/decorators.js';
import { UserTable } from 'src/schema/tables/user.table.js';

@Table('deleted_asset_tombstone')
@Index({
  name: 'UQ_deleted_asset_tombstone_owner_checksum',
  columns: ['ownerId', 'checksum'],
  unique: true,
})
export class DeletedAssetTombstoneTable {
  @PrimaryGeneratedUuidV7Column()
  id!: Generated<string>;

  @Column({ type: 'uuid', nullable: true })
  assetId?: string | null;

  @ForeignKeyColumn(() => UserTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: false })
  ownerId!: string;

  @Column({ type: 'bytea' })
  checksum!: Buffer;

  @CreateDateColumn({ default: () => 'clock_timestamp()' })
  deletedAt!: Generated<Timestamp>;
}

