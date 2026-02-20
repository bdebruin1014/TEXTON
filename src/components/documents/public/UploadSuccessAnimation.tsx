export function UploadSuccessAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 animate-in zoom-in duration-300">
        <span className="text-lg text-green-600">{"\u2713"}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-green-700">Uploaded successfully</p>
    </div>
  );
}
