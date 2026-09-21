import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ForeignKeyColumn,
  type Generated,
  Index,
  PrimaryGeneratedColumn,
  Table,
  Timestamp,
} from '@immich/sql-tools';
import { AssetTable } from 'src/schema/tables/asset.table.js';

@Table('asset_genai')
@Index({ columns: ['assetId'] })
export class AssetGenAiTable {
  @PrimaryGeneratedColumn()
  id!: Generated<string>;

  @ForeignKeyColumn(() => AssetTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  assetId!: string;

  @Column({ type: 'text' })
  prompt!: string;

  @Column({ type: 'text' })
  response!: string;

  @Column({ type: 'character varying', length: 255 })
  modelName!: string;

  @CreateDateColumn()
  createdAt!: Generated<Timestamp>;

  @DeleteDateColumn()
  deletedAt!: Timestamp | null;
}
