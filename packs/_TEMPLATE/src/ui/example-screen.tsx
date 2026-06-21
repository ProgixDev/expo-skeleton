import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { AppText, Button, Screen, TextField } from '@/shared/ui';

import { useCreateExample, useExamples } from '../use-example';

/**
 * DESIGN: replace after Claude Design pass. Functional placeholder — proves the
 * agnostic client (list + create) works on either backbone. Real UI drops onto
 * `useExamples` / `useCreateExample`.
 */
export function ExampleScreen() {
  const { data: examples = [], isLoading, error } = useExamples();
  const create = useCreateExample();
  const [draft, setDraft] = useState('');

  const submit = async () => {
    if (!draft.trim()) return;
    await create.mutateAsync({ title: draft });
    setDraft('');
  };

  return (
    <Screen>
      <View className="flex-1">
        {isLoading ? <AppText variant="caption">Loading…</AppText> : null}
        {error ? (
          <AppText variant="caption" className="text-danger">
            {error.message}
          </AppText>
        ) : null}
        <FlatList
          data={examples}
          keyExtractor={(e) => e.id}
          className="flex-1"
          renderItem={({ item }) => (
            <View className="mb-2 rounded-card bg-surface-muted p-3">
              <AppText variant="body">{item.title}</AppText>
            </View>
          )}
        />
        <View className="flex-row gap-2 pt-2">
          <TextField
            testID="example-input"
            value={draft}
            onChangeText={setDraft}
            placeholder="New example"
            onSubmitEditing={() => void submit()}
          />
          <Button testID="example-add" label="Add" onPress={() => void submit()} />
        </View>
      </View>
    </Screen>
  );
}
