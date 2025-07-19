import { Button, Icon, Inline, Select, Textfield } from '@forge/react'
import React, { useState } from 'react'
import z from 'zod/v4'

const ADD_NEW_OPTION_KEY = '___add_new_option___'

export default function Autocomplete({
  id = '',
  options: defaultOptions = [],
  value,
  onChange = () => {}
}: {
  id?: string
  options: string[]
  value?: string
  onChange?: (value: string) => void
}) {
  const [options, setOptions] = useState(defaultOptions)
  value ??= options[0] ?? ''
  const [addingNewOption, setAddingNewOption] = useState(false)
  const [newOptionValue, setNewOptionValue] = useState<string>('')
  const [newOptionIsValid, setNewOptionIsValid] = useState(false)

  const handleAddNewOption = () => {
    setOptions((current) => [...current, newOptionValue!])
    onChange(newOptionValue!)
    setAddingNewOption(false)
    setNewOptionValue('')
  }

  const handleCancelNewOption = () => {
    setNewOptionValue('')
    setAddingNewOption(false)
  }

  const handleEditNewOption = (value: string) => {
    setNewOptionIsValid(
      z.string().min(1).max(100).safeParse(value.trim()).success
    )
    setNewOptionValue(value)
  }

  const optionsForSelect = [
    ...options.map((option) => ({ label: option, value: option })),
    { label: 'Add New...', value: ADD_NEW_OPTION_KEY }
  ]

  return addingNewOption ? (
    <Inline space='space.050'>
      <Textfield
        autoFocus
        id={id}
        value={newOptionValue}
        isInvalid={!newOptionIsValid}
        onChange={(e) => handleEditNewOption(e.target.value)}
      />
      <Button
        appearance='primary'
        isDisabled={!newOptionIsValid}
        onClick={handleAddNewOption}>
        <Icon label='add' glyph='check' size='small' />
      </Button>
      <Button onClick={handleCancelNewOption}>
        <Icon label='cancel' glyph='cross' size='small' />
      </Button>
    </Inline>
  ) : (
    <Select
      autoFocus
      isSearchable
      id={id}
      options={optionsForSelect}
      value={{ label: value, value }}
      onChange={(value) =>
        value.value === ADD_NEW_OPTION_KEY
          ? setAddingNewOption(true)
          : onChange(value.value)
      }
    />
  )
}
