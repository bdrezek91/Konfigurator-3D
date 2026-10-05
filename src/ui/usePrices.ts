import { useEffect, useState } from 'react'
import { loadPrices, onPricesChange } from '../pricing'

/** Stan cennika z pamięci przeglądarki, odświeżany po zapisie w panelu wyceny. */
export function usePrices() {
  const [state, setState] = useState(loadPrices)
  useEffect(() => onPricesChange(() => setState(loadPrices())), [])
  return state
}
