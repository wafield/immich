import {
  Column,
  ForeignKeyColumn,
  type Generated,
  PrimaryColumn,
  Table,
  Timestamp,
  UpdateDateColumn,
} from '@immich/sql-tools';
import { UpdatedAtTrigger } from 'src/decorators.js';
import { AlbumTable } from 'src/schema/tables/album.table.js';

@Table({ name: 'album_day' })
@UpdatedAtTrigger('album_day_updatedAt')
export class AlbumDayTable {
  @ForeignKeyColumn(() => AlbumTable, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: false,
    primary: true,
  })
  albumId!: string;

  @PrimaryColumn({ type: 'date' })
  date!: string;

  @Column({ type: 'text', default: '' })
  description!: Generated<string>;

  @UpdateDateColumn()
  updatedAt!: Generated<Timestamp>;
}
