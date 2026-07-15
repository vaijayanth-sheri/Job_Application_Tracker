import { Loader2, Search } from "lucide-react";
import { FormState, SourceOption } from "../types";

type SearchFormProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  sources: SourceOption[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isSearching: boolean;
  isSubmitting: boolean;
};

export function SearchForm({
  form,
  setForm,
  sources,
  onSubmit,
  isSearching,
  isSubmitting,
}: SearchFormProps) {
  function updateSource(sourceId: string, checked: boolean) {
    setForm((current) => {
      const selectedSources = checked
        ? Array.from(new Set([...current.selectedSources, sourceId]))
        : current.selectedSources.filter((source) => source !== sourceId);
      return { ...current, selectedSources };
    });
  }

  return (
    <form
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="col-span-1 md:col-span-2 lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Keyword
          </label>
          <input
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
            value={form.keyword}
            onChange={(e) => setForm({ ...form, keyword: e.target.value })}
            placeholder="e.g. Energy Data Analyst"
          />
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="e.g. Munich, Germany"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Radius (km)
          </label>
          <input
            min={0}
            max={200}
            type="number"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
            value={form.distanceKm}
            onChange={(e) =>
              setForm({ ...form, distanceKm: Number(e.target.value) })
            }
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Jobs per Source
          </label>
          <input
            min={1}
            max={100}
            type="number"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
            value={form.resultsPerSource}
            onChange={(e) =>
              setForm({ ...form, resultsPerSource: Number(e.target.value) })
            }
          />
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Freshness
          </label>
          <div className="flex items-center gap-3">
            <input
              min={1}
              max={720}
              type="number"
              className="w-1/2 rounded-lg border border-gray-300 px-4 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
              value={form.freshnessValue}
              onChange={(e) =>
                setForm({ ...form, freshnessValue: Number(e.target.value) })
              }
            />
            <select
              className="w-1/2 rounded-lg border border-gray-300 px-4 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all bg-white"
              value={form.freshnessUnit}
              onChange={(e) =>
                setForm({
                  ...form,
                  freshnessUnit: e.target.value as FormState["freshnessUnit"],
                })
              }
            >
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mb-6 pt-4 border-t border-gray-100">
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Job Boards
        </label>
        <div className="flex flex-wrap gap-3">
          {sources.map((source) => {
            const isSelected = form.selectedSources.includes(source.id);
            const isDisabled = !source.available || isSearching;

            return (
              <label
                key={source.id}
                title={source.reason}
                className={`
                  relative flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all cursor-pointer select-none
                  ${
                    isDisabled
                      ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-200"
                      : isSelected
                      ? "bg-brand-50 border-brand-500 text-brand-900 shadow-sm ring-1 ring-brand-500"
                      : "bg-white border-gray-300 text-gray-700 hover:border-brand-300 hover:bg-gray-50"
                  }
                `}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  disabled={isDisabled}
                  checked={isSelected}
                  onChange={(e) => updateSource(source.id, e.target.checked)}
                />
                <span className="text-sm font-medium">{source.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          type="submit"
          disabled={isSubmitting || isSearching}
          className="inline-flex items-center gap-2 bg-brand-600 text-white px-8 py-3 rounded-lg font-medium shadow-sm hover:bg-brand-700 hover:shadow transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting || isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          <span>{isSearching ? "Searching jobs..." : "Start Search"}</span>
        </button>
      </div>
    </form>
  );
}
