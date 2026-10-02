import { useMemo } from 'react'
import type { ComponentModel } from '../components'
import type { PavilionConfig } from '../types'

export type Accuracy = 'exact' | 'project' | 'assumption' | 'estimate'

export const ACCURACY_LABELS: Record<Accuracy, string> = {
  exact: 'dokładna',
  project: 'z projektu',
  assumption: 'założenie',
  estimate: 'szacunek',
}

export const ACCURACY_HELP: Record<Accuracy, string> = {
  exact: 'Wynika wprost z wymiarów konfiguracji.',
  project: 'Z wymiarów projektu referencyjnego lub zwymiarowanej stolarki.',
  assumption: 'Parametr przyjęty w modelu (moduł, rozstaw, rozwinięcie) — do potwierdzenia detalem.',
  estimate: 'Wartość liczona z założeń — orientacyjna.',
}

export type Metric = { label: string; value: string; accuracy: Accuracy }

/** Metryki z modelu komponentów z jawnym podziałem: dokładne / z projektu / założenie / szacunek. */
export function useMetrics(config: PavilionConfig, model: ComponentModel): Metric[] {
  return useMemo(() => {
    const m = model.metrics
    const openingsDimensioned = (config.geometry?.openings ?? []).every((o) => o.sourceAccuracy === 'dimensioned') && (config.geometry?.openings.length ?? 0) > 0
    const cassettes = model.components.filter((c) => c.id.startsWith('facade-cassette-') || c.id.startsWith('corner-cassette-'))
    const decorArea = model.components
      .filter((c) => c.category === 'decor')
      .reduce((sum, c) => sum + (c.dimensions.netAreaM2 ?? (c.dimensions.lengthMm * c.dimensions.widthMm) / 1e6), 0)
    return [
      { label: 'Podłoga', value: m.floorAreaM2.toFixed(1) + ' m²', accuracy: 'exact' },
      { label: 'Ściany netto', value: m.netWallAreaM2.toFixed(1) + ' m²', accuracy: openingsDimensioned ? 'project' : 'exact' },
      { label: 'Dach', value: m.roofAreaM2.toFixed(1) + ' m²', accuracy: 'exact' },
      { label: 'Elewacja', value: decorArea.toFixed(1) + ' m²', accuracy: config.geometry ? 'project' : 'assumption' },
      { label: 'Kasetony', value: cassettes.length + ' szt.', accuracy: 'assumption' },
      { label: 'Obróbki', value: m.flashingLengthM.toFixed(1) + ' mb', accuracy: 'assumption' },
      { label: 'Łączniki', value: String(m.fastenerCount), accuracy: 'estimate' },
      { label: 'Elementy modelu', value: String(m.componentCount), accuracy: 'exact' },
    ]
  }, [config, model])
}

