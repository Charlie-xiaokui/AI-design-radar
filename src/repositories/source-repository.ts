import { config } from "../config.ts";
import type { Source, SourceHealth, SourceReview, SourceType } from "../types/source.ts";
import { validateImportedSources, validateSourceInput } from "../validation/source.ts";
import { readJsonFile, writeJsonFile } from "./json-file.ts";

export interface SourceRepository {
  list(): Promise<Source[]>;
  create(input: Partial<Source>): Promise<Source>;
  update(id: string, input: Partial<Source>): Promise<Source>;
  delete(id: string): Promise<void>;
  replaceAll(input: unknown): Promise<Source[]>;
}

export class JsonSourceRepository implements SourceRepository {
  private readonly sourcesFile: string;

  constructor(sourcesFile = config.sourcesFile) {
    this.sourcesFile = sourcesFile;
  }

  async list(): Promise<Source[]> {
    return readJsonFile<Source[]>(this.sourcesFile);
  }

  async create(input: Partial<Source>): Promise<Source> {
    const sources = await this.list();
    const source = validateSourceInput(input);
    if (sources.some((item) => item.id === source.id || item.slug === source.slug)) {
      throw new Error("A source with this id or slug already exists");
    }
    sources.push(source);
    await writeJsonFile(this.sourcesFile, sources);
    return source;
  }

  async update(id: string, input: Partial<Source>): Promise<Source> {
    const sources = await this.list();
    const index = sources.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Source not found");
    const existing = sources[index];
    if (!existing) throw new Error("Source not found");
    const source = validateSourceInput(input, existing);
    if (sources.some((item, itemIndex) => itemIndex !== index && item.slug === source.slug)) {
      throw new Error("A source with this slug already exists");
    }
    sources[index] = source;
    await writeJsonFile(this.sourcesFile, sources);
    return source;
  }

  async delete(id: string): Promise<void> {
    const sources = await this.list();
    const next = sources.filter((item) => item.id !== id);
    if (next.length === sources.length) throw new Error("Source not found");
    await writeJsonFile(this.sourcesFile, next);

    const [health, reviews] = await Promise.all([
      readJsonFile<SourceHealth[]>(config.healthFile),
      readJsonFile<SourceReview[]>(config.reviewsFile),
    ]);
    await Promise.all([
      writeJsonFile(config.healthFile, health.filter((item) => item.source_id !== id)),
      writeJsonFile(config.reviewsFile, reviews.filter((item) => item.source_id !== id)),
    ]);
  }

  async replaceAll(input: unknown): Promise<Source[]> {
    const sources = validateImportedSources(input);
    await writeJsonFile(this.sourcesFile, sources);
    return sources;
  }
}

export class JsonRegistryMetadataRepository {
  async listHealth(): Promise<SourceHealth[]> {
    return readJsonFile<SourceHealth[]>(config.healthFile);
  }

  async saveHealth(health: SourceHealth[]): Promise<void> {
    await writeJsonFile(config.healthFile, health);
  }

  async listReviews(): Promise<SourceReview[]> {
    return readJsonFile<SourceReview[]>(config.reviewsFile);
  }

  async updateReview(
    sourceId: string,
    sourceType: SourceType,
    patch: Pick<SourceReview, "manual_verified" | "media_marked">,
  ): Promise<SourceReview> {
    const reviews = await this.listReviews();
    const index = reviews.findIndex(
      (item) => item.source_id === sourceId && item.source_type === sourceType,
    );
    const review: SourceReview = {
      source_id: sourceId,
      source_type: sourceType,
      manual_verified: Boolean(patch.manual_verified),
      media_marked: Boolean(patch.media_marked),
      updated_at: new Date().toISOString(),
    };
    if (index >= 0) reviews[index] = review;
    else reviews.push(review);
    await writeJsonFile(config.reviewsFile, reviews);
    return review;
  }
}
